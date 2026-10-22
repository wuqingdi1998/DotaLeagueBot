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
const css = ["01-foundation.css", "league-backdrop-preview.css"].map(name => readFileSync(new URL(`app/styles/${name}`, root), "utf8")).join("\n");
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
    await page.goto(url);
    assert.equal(await page.locator(".league-backdrop").count(), 0);
    await page.getByRole("button", { name: "Профиль участника", exact: true }).click();
    const select = page.getByRole("combobox", { name: "Оформление фона лиги" });
    assert.equal(await select.locator("option").count(), 21);
    for (let id = 1; id <= 20; id++) {
      await select.selectOption(String(id));
      assert.equal(await page.locator(".league-backdrop").count(), 1);
      const appearance = await page.locator(".league-backdrop").evaluate(element => ({ image: getComputedStyle(element).backgroundImage, pointer: getComputedStyle(element).pointerEvents, display: getComputedStyle(element).display }));
      assert.notEqual(appearance.image, "none");
      assert.equal(appearance.pointer, "none");
      assert.equal(appearance.display === "none", width <= 1050);
      if (width === 1920) await page.screenshot({ path: fileURLToPath(new URL(`variant-${id}.png`, directory)) });
    }
    await page.reload();
    await page.getByRole("button", { name: "Профиль участника", exact: true }).click();
    assert.equal(await select.getAttribute("aria-label"), "Оформление фона лиги");
    assert.equal(await select.evaluate(element => element.value), "20");
    await select.selectOption("none");
    assert.equal(await page.locator(".league-backdrop").count(), 0);
    await select.selectOption("1");
    await page.getByRole("button", { name: "Сменить доступ", exact: true }).click();
    assert.equal(await page.locator(".league-backdrop").count(), 0);
    assert.equal(await select.count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.close();
    console.log(`Twenty backdrop choices, persistence, reset and access verified at ${width}px`);
  }
} finally { await browser.close(); server.close(); }
