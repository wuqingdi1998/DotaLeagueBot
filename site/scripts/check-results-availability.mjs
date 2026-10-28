import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const directory = new URL(".data/results-availability/", root);
mkdirSync(directory, { recursive: true });
await build({
  configFile: false, root: fileURLToPath(root), logLevel: "error",
  resolve: { alias: { "@": fileURLToPath(root) } },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: fileURLToPath(new URL("bundle/", directory)), emptyOutDir: true,
    lib: { entry: fileURLToPath(new URL("tests/results-availability-browser.tsx", root)), formats: ["iife"], name: "ResultsAvailabilityCheck", fileName: () => "preview.js" },
  },
});
const css = ["01-foundation.css", "57-compendium-results.css", "74-compendium-results-compact.css", "75-compendium-results-availability.css"]
  .map(name => readFileSync(new URL(`app/styles/${name}`, root), "utf8")).join("\n");
const server = createServer((request, response) => {
  if (request.url === "/preview.js") {
    response.setHeader("content-type", "text/javascript");
    response.end(readFileSync(new URL("bundle/preview.js", directory)));
  } else if (request.url === "/archived-results") {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end("<!doctype html><meta charset='utf-8'><h1>Компендиум №2 · Архив</h1>");
  } else {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div id="root"></div><script src="/preview.js"></script>`);
  }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  for (const [width, height] of [[1366, 768], [393, 852]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.addInitScript(() => { Date.now = () => Date.parse("2099-01-01T00:00:00Z"); });
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(base);
    const counter = page.locator(".compendium-results-availability time");
    await counter.waitFor();
    assert.match(await counter.textContent(), /^7[12]:\d{2}:\d{2}$/);
    await page.waitForFunction(() => document.querySelector("time")?.textContent.startsWith("71:"));
    const badge = await page.locator(".compendium-results-availability").boundingBox();
    assert.ok(badge.x >= 0 && badge.x + badge.width <= width);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (width > 720) {
      const label = await page.locator(".compendium-results-eyebrow").boundingBox();
      assert.ok(Math.abs(label.y + label.height / 2 - badge.y - badge.height / 2) < 2);
    }
    await page.screenshot({ path: fileURLToPath(new URL(`countdown-${width}.png`, directory)) });
    await page.goto(`${base}/?mode=expires`);
    await page.waitForURL(`${base}/archived-results`);
    await page.getByRole("heading", { name: "Компендиум №2 · Архив" }).waitFor();
    await page.close();
    console.log(`Live countdown, device-clock independence and archive transition verified at ${width} × ${height}`);
  }
} finally {
  await browser.close();
  server.close();
}
