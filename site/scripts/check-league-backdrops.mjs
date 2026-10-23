import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { chromium } from "playwright";
const root = new URL("../", import.meta.url);
const directory = new URL(".data/league-backdrops/", root);
mkdirSync(directory, { recursive: true });
await build({ configFile: false, root: fileURLToPath(root), logLevel: "error",
  resolve: { alias: { "@": fileURLToPath(root) } },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: { outDir: fileURLToPath(new URL("bundle/", directory)), emptyOutDir: true,
    lib: { entry: fileURLToPath(new URL("tests/league-backdrop-browser.tsx", root)), formats: ["iife"], name: "BackdropCheck", fileName: () => "preview.js" } } });
const css = ["01-foundation.css", "02-site-header.css", "league-backdrop-preview.css"].map(name => readFileSync(new URL(`app/styles/${name}`, root), "utf8")).join("\n");
const server = createServer((request, response) => {
  if (request.url === "/preview.js") { response.setHeader("content-type", "text/javascript"); response.end(readFileSync(new URL("bundle/preview.js", directory))); }
  else { response.setHeader("content-type", "text/html; charset=utf-8"); response.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script src="/preview.js"></script>`); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  for (const width of [1920, 1366, 393]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const url = `http://127.0.0.1:${server.address().port}`;
    await page.route("**/api/season?*", route => route.fulfill({ json: {
      isOrganizer: true, standings: [], rounds: [],
    } }));
    await page.goto(url);
    assert.equal(await page.locator(".league-backdrop").count(), 1);
    await page.getByRole("button", { name: "Профиль участника", exact: true }).click();
    const download = page.getByRole("button", { name: "Скачать Excel", exact: true });
    assert.equal(await download.count(), 1);
    const bounds = await download.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
    const savedFile = page.waitForEvent("download");
    await download.click();
    const file = await savedFile;
    assert.equal(file.suggestedFilename(), "test-league-table.xlsx");
    assert.equal(await file.failure(), null);
    await file.saveAs(fileURLToPath(new URL(`excel-${width}.xlsx`, directory)));
    await page.screenshot({ path: fileURLToPath(new URL(`excel-menu-${width}.png`, directory)) });
    const select = page.getByRole("combobox", { name: "Оформление фона турнира" });
    assert.equal(await select.locator("option").count(), 21);
    for (let id = 1; id <= 20; id++) {
      await select.selectOption(String(id));
      assert.equal(await page.locator(".league-backdrop").count(), 1);
      const appearance = await page.locator(".league-backdrop").evaluate(element => ({ image: getComputedStyle(element).backgroundImage, top: element.getBoundingClientRect().top, pointer: getComputedStyle(element).pointerEvents, display: getComputedStyle(element).display }));
      assert.notEqual(appearance.image, "none");
      assert.equal(appearance.pointer, "none");
      if (width > 1050) assert.equal(appearance.top, 0);
      assert.equal(appearance.display === "none", width <= 1050);
      if (width === 1920) await page.screenshot({ path: fileURLToPath(new URL(`variant-${id}.png`, directory)) });
    }
    await page.reload();
    await page.getByRole("button", { name: "Профиль участника", exact: true }).click();
    assert.equal(await select.getAttribute("aria-label"), "Оформление фона турнира");
    assert.equal(await select.evaluate(element => element.value), "1");
    await select.selectOption("none");
    assert.equal(await page.locator(".league-backdrop").count(), 0);
    await select.selectOption("1");
    await page.getByRole("button", { name: "Сменить доступ", exact: true }).click();
    assert.equal(await page.locator(".league-backdrop").count(), 1);
    assert.equal(await select.count(), 0);
    assert.equal(await download.count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.close();
    console.log(`Twenty backdrop choices, persistence, reset and access verified at ${width}px`);
  }
} finally { await browser.close(); server.close(); }
