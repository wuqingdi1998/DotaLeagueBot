import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const directory = new URL(".data/final-race-preview/", root);
mkdirSync(directory, { recursive: true });
writeFileSync(new URL("navigation.js", directory), "export function useRouter() { return { refresh() {} }; }");
writeFileSync(new URL("link.js", directory), "import { createElement } from 'react'; export default function Link({children,...props}) { return createElement('a',props,children); }");
writeFileSync(new URL("image.js", directory), "import { createElement } from 'react'; export default function Image({unoptimized,priority,children,...props}) { return createElement('img',props,children); }");
await build({
  configFile: false, root: fileURLToPath(root), logLevel: "error",
  resolve: { alias: { "@": fileURLToPath(root), ...Object.fromEntries(["image", "link", "navigation"].map((name) => [`next/${name}`, fileURLToPath(new URL(`${name}.js`, directory))])) } },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: { outDir: fileURLToPath(new URL("bundle/", directory)), emptyOutDir: true,
    lib: { entry: fileURLToPath(new URL("tests/final-race-preview-browser.tsx", root)), formats: ["iife"], name: "FinalRaceCheck", fileName: () => "preview.js" } },
});
const styles = new URL("app/styles/", root);
const names = ["01-foundation.css", ...[...readFileSync(new URL("compendium-route.css", styles), "utf8").matchAll(/@import "\.\/(.*?)";/g)].map((match) => match[1])];
const css = names.map((name) => readFileSync(new URL(name, styles), "utf8")).join("\n");
const unexpectedRequests = [];
const server = createServer((request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (request.method !== "GET" || (pathname.startsWith("/api/") && !pathname.startsWith("/api/compendium/heroes/"))) unexpectedRequests.push(`${request.method} ${pathname}`);
  if (pathname === "/preview.js") {
    response.setHeader("content-type", "text/javascript");
    response.end(readFileSync(new URL("bundle/preview.js", directory)));
  } else if (pathname.startsWith("/api/compendium/heroes/")) {
    response.setHeader("content-type", "image/svg+xml");
    response.end('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#244352"/></svg>');
  } else if (pathname !== "/") {
    const file = new URL(`public${pathname}`, root);
    if (!existsSync(file)) { response.writeHead(404); response.end(); return; }
    if (pathname.endsWith(".webp")) response.setHeader("content-type", "image/webp");
    response.end(readFileSync(file));
  } else {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div class="site-shell" data-theme="dark" id="root"></div><script src="/preview.js"></script>`);
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  for (const [width, height] of [[1900, 870], [1366, 768], [961, 700], [393, 852]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const reset = page.getByRole("button", { name: "Сбросить тестовую неделю", exact: true });
    const daySelect = page.getByLabel("День гонки");
    for (const path of ["Путь Разрушения (Core)", "Путь Созидания (Support)"]) {
      await page.getByRole("button", { name: path, exact: true }).waitFor({ state: "visible" });
      assert.equal(await page.locator(".compendium-star-race-quest").count(), 0);
      assert.equal(await daySelect.isDisabled(), true);
      assert.equal(await page.locator(".compendium-final-race-path img").evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)), true);
      const spacing = await page.locator(".compendium-final-race-choice").evaluate((panel) => {
        const outer = panel.getBoundingClientRect();
        const intro = panel.querySelector("header").getBoundingClientRect();
        const paths = panel.querySelector(".compendium-final-race-paths").getBoundingClientRect();
        const note = panel.querySelector("footer").getBoundingClientRect();
        return [intro.top - outer.top - panel.clientTop, paths.top - intro.bottom, note.top - paths.bottom, outer.bottom - note.bottom - panel.clientTop];
      });
      assert.ok(spacing.every((gap) => Math.abs(gap - 24) < 1), `Balanced text spacing: ${spacing}`);
      if (path.includes("Core")) await page.screenshot({ path: fileURLToPath(new URL(`choice-${width}.png`, directory)), fullPage: true });
      await page.getByRole("button", { name: path, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: `Хотите выбрать ${path.includes("Core") ? "Путь Разрушения" : "Путь Созидания"}?`, exact: true });
      await dialog.waitFor();
      assert.equal(await dialog.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight && element.scrollHeight <= element.clientHeight;
      }), true, "Confirmation fits the viewport without clipping");
      assert.match(await dialog.innerText(), /Выбор окончательный и его нельзя будет изменить/);
      assert.match(await dialog.innerText(), path.includes("Core") ? /игроков основы/ : /игроков поддержки/);
      assert.equal(await page.locator(".compendium-star-race-quest").count(), 0);
      assert.equal(await daySelect.isDisabled(), true);
      await page.screenshot({ path: fileURLToPath(new URL(`confirmation-${path.includes("Core") ? "core" : "support"}-${width}.png`, directory)), fullPage: true });
      await dialog.getByRole("button", { name: "Отмена", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
      assert.equal(await page.locator(".compendium-final-race-path").count(), 2);
      assert.equal(await page.getByRole("button", { name: path, exact: true }).evaluate((button) => button === document.activeElement), true);
      await page.getByRole("button", { name: path, exact: true }).click();
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      await page.getByRole("button", { name: path, exact: true }).click();
      await page.mouse.click(2, 2);
      await dialog.waitFor({ state: "hidden" });
      await page.getByRole("button", { name: path, exact: true }).click();
      await dialog.getByRole("button", { name: "Выбрать путь", exact: true }).click();
      assert.equal(await page.locator(".compendium-final-race-path").count(), 0);
      assert.equal(await page.locator(".compendium-star-race-quest").count(), 7);
      for (let day = 0; day < 7; day++) {
        if (day > 0) await page.getByRole("button", { name: "Следующий день", exact: true }).click();
        await page.getByRole("button", { name: "Выполнить (тест)", exact: true }).click();
        assert.equal(await page.locator(".compendium-star-race-quest.completed").count(), day + 1);
        assert.equal(await page.locator(".compendium-star-race-total-value").innerText(), String(day === 6 ? 29 : (day + 1) * 4));
        assert.equal(await page.getByRole("button", { name: "Выполнить (тест)", exact: true }).count(), 0);
      }
      await daySelect.selectOption("4");
      const friday = page.locator(".compendium-star-race-quest").nth(4);
      assert.equal(await friday.locator(".compendium-hero").count(), 6);
      const heroNames = await friday.locator(".compendium-hero strong").allTextContents();
      assert.deepEqual(heroNames, [...heroNames].sort((left, right) => left.localeCompare(right, "en")));
      await page.screenshot({ path: fileURLToPath(new URL(`${path.includes("Core") ? "core" : "support"}-${width}.png`, directory)), fullPage: true });
      await reset.click();
      assert.equal(await daySelect.inputValue(), "0");
      assert.equal(await page.locator(".compendium-star-race-quest").count(), 0);
      await page.getByRole("button", { name: path, exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Выбрать путь", exact: true }).click();
      assert.equal(await page.locator(".compendium-star-race-total-value").innerText(), "0");
      await reset.click();
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.close();
  }
  assert.deepEqual(unexpectedRequests, []);
  console.log("Both preview paths, hidden quests, 29 test stars, locked choice and full reset verified without live reward requests.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
