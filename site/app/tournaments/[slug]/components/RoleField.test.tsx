import { mkdirSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { expect, it } from "vitest";
import { RoleIcon } from "./RoleField";

const roles = ["safe_lane", "mid_lane", "off_lane", "soft_support", "hard_support", "coach"] as const;
const files = ["safe-lane", "mid-lane", "off-lane", "soft-support", "hard-support", "coach"];
const backgrounds = ["rgba(0, 157, 217, 0.12)", "rgba(219, 60, 72, 0.12)", "rgba(145, 91, 48, 0.13)", "rgba(255, 221, 103, 0.24)", "rgba(36, 183, 118, 0.11)"];

it("uses accessible classic Dota role symbols, including the coach", () => {
  for (const role of roles) {
    const html = renderToStaticMarkup(<RoleIcon role={role} />);
    expect(html).toContain(`role-icon role-${role}`);
    expect(html).toContain('aria-label="');
    expect(html).toContain('class="role-icon-symbol" aria-hidden="true"');
    expect(html).not.toContain("<svg");
  }
});

it("loads all original symbols and preserves role backgrounds in both themes on desktop and phone", async () => {
  const css = ["01-foundation.css", "05-tournament-teams.css"]
    .map((file) => readFileSync(`app/styles/${file}`, "utf8")).join("\n");
  const browser = await chromium.launch();
  mkdirSync(".data/tournament-role-icons", { recursive: true });
  try {
    for (const width of [1366, 393]) {
      for (const theme of ["light", "dark"]) {
        const page = await browser.newPage({ viewport: { width, height: 400 } });
        const loaded = new Set<string>();
        await page.route("https://role-icons.test/**", (route) => {
          const path = new URL(route.request().url()).pathname;
          if (!path.startsWith("/tournament-roles/")) return route.abort();
          loaded.add(path);
          return route.fulfill({ contentType: "image/png", body: readFileSync(`public${path}`) });
        });
        await page.setContent(`<html data-theme="${theme}"><base href="https://role-icons.test"><style>${css}</style><div style="display:flex;gap:16px;padding:24px">${roles.map((role) => renderToStaticMarkup(<RoleIcon role={role} />)).join("")}</div></html>`);
        for (const [index, role] of roles.entries()) {
          const icon = page.locator(`.role-${role}`);
          expect(await icon.locator(".role-icon-symbol").evaluate((node) => getComputedStyle(node).maskImage))
            .toContain(`/tournament-roles/${files[index]}.png`);
          expect(loaded.has(`/tournament-roles/${files[index]}.png`)).toBe(true);
          if (index < backgrounds.length) {
            expect(await icon.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(backgrounds[index]);
          }
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        await page.screenshot({ path: `.data/tournament-role-icons/${theme}-${width}.png` });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}, 30000);
