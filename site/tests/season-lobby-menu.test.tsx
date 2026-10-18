import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SeasonLobbyOptimizationMenu } from "@/app/tournaments/[slug]/admin/SeasonLobbyOptimizationMenu";

it("shows five optimal lineups and both challenges without clipping on desktop and mobile", async () => {
  const directory = new URL("../.data/season-lobby-menu/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  const css = ["01-foundation.css", "05-tournament-teams.css", "56-season-lobby-builder.css", "56-season-lobby-optimization-menu.css"]
    .map((name) => readFileSync(new URL(`../app/styles/${name}`, import.meta.url), "utf8")).join("\n");
  const html = renderToStaticMarkup(<div className="season-builder-optimization">
    <SeasonLobbyOptimizationMenu busy={false} disabled={false} onOptimize={() => undefined} />
  </div>);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
  try {
    for (const [width, height] of [[1900, 870], [1366, 768], [768, 1024], [393, 852]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.setContent(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><main style="padding:24px;max-width:1000px;margin:auto">${html}</main>`);
      await page.getByRole("button", { name: "Показать варианты состава" }).focus();
      const items = page.getByRole("menuitem");
      await items.last().waitFor({ state: "visible" });
      expect(await items.allTextContents()).toEqual([
        "Оптимальный состав", "Оптимальный состав 2", "Оптимальный состав 3",
        "Оптимальный состав 4", "Оптимальный состав 5", "Играли вместе", "Челлендж", "Челлендж ALT",
      ]);
      expect(await items.evaluateAll((buttons) => buttons.every((button) => {
        const bounds = button.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight && button.scrollWidth <= button.clientWidth;
      }))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: fileURLToPath(new URL(`menu-${width}.png`, directory)), fullPage: true });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}, 30_000);
