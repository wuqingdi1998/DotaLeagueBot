import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const directory = new URL(".data/season-standings/", root);
mkdirSync(directory, { recursive: true });
await build({ configFile: false, root: fileURLToPath(root), logLevel: "error",
  resolve: { alias: [
    { find: /^.*\/hooks\/TournamentContext$/, replacement: fileURLToPath(new URL("tests/season-standings-context.ts", root)) },
    { find: "@/app/components/PlayerProfileLink", replacement: fileURLToPath(new URL("tests/season-standings-identities.tsx", root)) },
    { find: "@/app/components/AvatarImage", replacement: fileURLToPath(new URL("tests/season-standings-identities.tsx", root)) },
    { find: "@", replacement: fileURLToPath(root) },
  ] },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: { outDir: fileURLToPath(new URL("bundle/", directory)), emptyOutDir: true,
    lib: { entry: fileURLToPath(new URL("tests/season-standings-browser.tsx", root)), formats: ["iife"], name: "StandingsCheck", fileName: () => "preview.js" } },
});
function loadCss(url) {
  return readFileSync(url, "utf8").replace(/@import "(.*?)";/g, (_, path) => path.startsWith(".") ? loadCss(new URL(path, url)) : "");
}
const css = loadCss(new URL("app/globals.css", root)) + loadCss(new URL("app/styles/tournaments-route.css", root));
const server = createServer((request, response) => {
  if (request.url === "/preview.js") {
    response.setHeader("content-type", "text/javascript");
    response.end(readFileSync(new URL("bundle/preview.js", directory)));
  } else if (request.url.startsWith("/fonts/")) {
    response.end(readFileSync(new URL(`public${request.url}`, root)));
  } else {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script src="/preview.js"></script>`);
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  for (const [width, height] of [[1900, 870], [1366, 768], [768, 1024], [393, 852], [320, 740]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 600, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const historical of [false, true]) {
      await page.goto(`http://127.0.0.1:${server.address().port}/${historical ? "?historical" : ""}`);
      const button = page.getByRole("button", { name: "Как начисляются очки", exact: true });
      await button.waitFor();
      await page.evaluate(() => document.fonts.ready);
      // The panel enters with an 8px translation; compare only its settled geometry.
      await page.locator(".season-standings-panel").evaluate(async (node) => {
        await Promise.all(node.getAnimations().map((animation) => animation.finished));
      });
      const table = page.locator(".season-standings-table").first();
      const scroll = page.locator(".season-table-scroll").first();
      const fullWidth = await page.locator(".season-standings-panel").evaluate((node) => node.clientWidth);
      const scrollWidth = await scroll.evaluate((node) => node.clientWidth);
      assert.ok(Math.abs(fullWidth - scrollWidth) < 3, "Standings must use the full panel width");
      assert.ok((await table.locator("tbody tr").first().boundingBox()).height <= 49, "Rows should be compact");
      const identityLine = await table.locator("tbody .season-player-avatar-column").first().evaluate((node) => {
        const line = getComputedStyle(node, "::before");
        return { width: line.width, background: line.backgroundColor, rankBorder: getComputedStyle(node.previousElementSibling).borderRightColor };
      });
      assert.equal(identityLine.width, "1px");
      assert.equal(identityLine.background, identityLine.rankBorder);
      assert.notEqual(identityLine.background, "rgba(0, 0, 0, 0)");
      assert.equal(await page.getByRole("tooltip").count(), 0);
      const previousBounds = await scroll.boundingBox();
      if (width >= 600) await button.hover();
      else await button.tap();
      const tooltip = page.getByRole("tooltip", { name: "Легенда таблицы" });
      await tooltip.waitFor();
      await page.waitForFunction(() => {
        const bounds = document.querySelector(".season-standings-legend")?.getBoundingClientRect();
        return bounds && bounds.top >= 15 && bounds.bottom <= innerHeight - 15;
      });
      assert.equal(await tooltip.getByText("Базовые очки за активность этого сезона.", { exact: false }).count(), historical ? 1 : 0);
      const bounds = await tooltip.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, "Scoring information must fit the screen");
      assert.ok(bounds.y >= 15 && bounds.y + bounds.height <= height - 15, "Scoring information must fit vertically");
      assert.deepEqual(await scroll.boundingBox(), previousBounds, "Opening information must not narrow the table");
      await page.screenshot({ path: fileURLToPath(new URL(`info-${historical ? "archive" : "current"}-${width}.png`, directory)) });
      if (width >= 600) {
        await tooltip.hover();
        assert.equal(await tooltip.isVisible(), true);
        await page.locator("#outside").hover();
        await tooltip.waitFor({ state: "detached" });
      } else {
        await button.tap();
        await tooltip.waitFor({ state: "detached" });
      }
      await button.focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      await tooltip.waitFor();
      await page.keyboard.press("Escape");
      await tooltip.waitFor({ state: "detached" });
      await button.click();
      await tooltip.waitFor();
      await page.locator("#outside").click();
      await tooltip.waitFor({ state: "detached" });
      await page.locator("#outside").evaluate((node) => { node.style.marginBottom = "340px"; });
      await page.evaluate(() => {
        const header = document.createElement("header");
        header.id = "fixture-sticky-header";
        header.className = "site-header";
        Object.assign(header.style, { position: "fixed", top: "0", left: "0", right: "0", height: "76px", zIndex: "20" });
        document.body.append(header);
      });
      await button.scrollIntoViewIfNeeded();
      await button.click();
      await tooltip.waitFor();
      await page.waitForFunction(() => {
        const bounds = document.querySelector(".season-standings-legend")?.getBoundingClientRect();
        return bounds && bounds.top >= 83 && bounds.bottom <= innerHeight - 15;
      });
      const lowerBounds = await tooltip.boundingBox();
      assert.ok(lowerBounds.y >= 83 && lowerBounds.y + lowerBounds.height <= height - 15, "Scoring information must fit between the sticky header and screen edge");
      await page.keyboard.press("Escape");
      await page.locator("#fixture-sticky-header").evaluate((node) => node.remove());
      await page.locator("#outside").evaluate((node) => { node.style.marginBottom = "0px"; });
      await page.getByLabel("Предпросмотр скрытых туров").check();
      assert.ok((await table.locator("thead th").allTextContents()).includes("Тур 15"));
      await scroll.evaluate((node) => { node.scrollLeft = 280; });
      const avatar = await table.locator("tbody .season-player-avatar-column").first().boundingBox();
      const viewport = await scroll.boundingBox();
      assert.ok(Math.abs(avatar.x - viewport.x) <= 2, "Sticky player identity must remain visible");
      await scroll.evaluate((node) => { node.scrollLeft = 0; });
      await table.getByRole("button").first().click();
      assert.equal(await page.locator("html").getAttribute("data-opened-round"), "1");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: fileURLToPath(new URL(`table-${historical ? "archive" : "current"}-${width}.png`, directory)), fullPage: true });
      await page.locator(".site-shell").evaluate((node) => { node.dataset.theme = "light"; });
      await button.hover();
      await page.screenshot({ path: fileURLToPath(new URL(`light-${historical ? "archive" : "current"}-${width}.png`, directory)) });
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log("League standings: full width, compact rows, visible divider, scoring hover/tap/keyboard, scrolling and current/archive rules verified");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
