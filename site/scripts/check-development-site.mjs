import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const directory = new URL(".data/development-site/", root);
mkdirSync(directory, { recursive: true });
await build({
  configFile: false, root: fileURLToPath(root), logLevel: "error",
  resolve: { alias: { "@": fileURLToPath(root) } },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: fileURLToPath(new URL("bundle/", directory)), emptyOutDir: true,
    lib: { entry: fileURLToPath(new URL("tests/development-browser.tsx", root)), formats: ["iife"], name: "DevelopmentCheck", fileName: () => "preview.js" },
  },
});
const css = ["01-foundation.css", "07-tournament-dialogs.css", "07-organizer-password.css", "08-auth-page.css", "03-development-site.css"]
  .map(name => readFileSync(new URL(`app/styles/${name}`, root), "utf8")).join("\n");
const server = createServer((request, response) => {
  if (request.url === "/preview.js") {
    response.setHeader("content-type", "text/javascript");
    response.end(readFileSync(new URL("bundle/preview.js", directory)));
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
    let status = "ahead";
    await page.route("**/api/development/changes", route => status === "failure"
      ? route.fulfill({ status: 401, json: { error: "Войдите" } })
      : route.fulfill({ json: {
        developmentRevision: "a".repeat(40), productionRevision: "b".repeat(40), status,
        changes: status === "ahead" ? Array.from({ length: 20 }, (_, index) => ({
          revision: String(index), title: `Обновление ${index + 1}: проверка матчей и календаря перед публикацией`, createdAt: "2026-10-28",
        })) : [],
      } }));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const button = page.getByRole("button", { name: "Отличия тестового сайта от основного" });
    await button.click();
    await page.getByRole("heading", { name: "Подготовлено обновлений: 20" }).waitFor();
    const dialog = page.getByRole("dialog");
    assert.equal(await dialog.locator("li").count(), 20);
    const bounds = await dialog.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= height + 1);
    assert.equal(await dialog.evaluate(element => element.scrollWidth > element.clientWidth), false);
    await page.screenshot({ path: fileURLToPath(new URL(`changes-${width}.png`, directory)) });
    await page.keyboard.press("Escape");
    assert.equal(await dialog.isVisible(), false);
    for (status of ["equal", "unavailable", "failure"]) {
      await button.click();
      const message = status === "equal" ? "Версии совпадают." : status === "unavailable" ? "Точное сравнение недоступно." : "Не удалось загрузить отличия.";
      await dialog.getByText(message, { exact: false }).waitFor();
      assert.equal(await dialog.locator("li").count(), 0);
      await page.getByRole("button", { name: "Закрыть отличия" }).click();
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: fileURLToPath(new URL(`login-${width}.png`, directory)) });
    await page.close();
    console.log(`Development login and release comparison verified at ${width} × ${height}`);
  }
} finally {
  await browser.close();
  server.close();
}
