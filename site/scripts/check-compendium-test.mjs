import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const directory = new URL(".data/compendium-test/", root);
const initialMarkup = readFileSync(new URL("frame.html", directory), "utf8").split('<div id="compendium-test">')[1]?.split("<script>")[0];
assert.match(initialMarkup ?? "", /<img\b[^>]*src="\/compendium\/october\/prizes\/[^"\s]+-thumbnail-[a-f0-9]+\.webp"/, "Saved thumbnails must be present before the application script runs");
const vite = await createViteServer({ configFile: false, root: fileURLToPath(root), optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true } });
const { renderTestDocument, TEST_DOCUMENT_HEADERS } = await vite.ssrLoadModule("/app/compendium/test/server/test-document.ts");
await vite.close();
const violations = [];
const server = createServer((request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/compendium/test") {
    response.writeHead(200, TEST_DOCUMENT_HEADERS);
    response.end(renderTestDocument(readFileSync(new URL("frame.html", directory), "utf8"), `http://127.0.0.1:${server.address().port}`));
    return;
  }
  if (request.method !== "GET" || !(pathname.startsWith("/compendium/") || pathname.startsWith("/api/compendium/heroes/") || pathname === "/linkens-sphere-logo.png")) violations.push(`${request.method} ${pathname}`);
  if (request.headers.cookie?.includes("main-session-sentinel")) violations.push(`Cookie sent by isolated frame: ${pathname}`);
  const file = new URL(`public${pathname}`, root);
  if (!existsSync(file)) { response.writeHead(404); response.end(); return; }
  response.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
async function openSection(frame, section) {
  await frame.getByRole("button", { name: "Управление тестом", exact: true }).click();
  await frame.getByRole("button", { name: section, exact: true }).click();
}
try {
  for (const [width, height] of [[1900, 870], [1366, 768], [961, 700], [393, 852]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addCookies([{ name: "main-session-sentinel", value: "protected", url }]);
    const page = await context.newPage();
    const browserErrors = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    await page.route(`${url}/api/compendium/heroes/**`, async (route) => {
      assert.equal(route.request().method(), "GET");
      assert.equal((await route.request().allHeaders()).cookie, undefined, "Hero images must not receive the main session");
      await route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#244352"/></svg>' });
    });
    await page.goto(`${url}/compendium/test`);
    const frame = page.frames().find((frame) => frame.parentFrame());
    await openSection(frame, "Гонка");
    await frame.getByRole("button", { name: "Путь Созидания (Support)", exact: true }).click();
    await frame.getByRole("button", { name: "Выполнить (тест)", exact: true }).click();
    assert.equal(await frame.getByTestId("test-total").innerText(), "★ 4");
    await openSection(frame, "Задания");
    await frame.getByRole("button", { name: "Скрыть пояснение к заданиям дня", exact: true }).click();
    await frame.getByRole("button", { name: "Скрыть пояснение к клановой вылазке", exact: true }).click();
    assert.equal(await frame.locator(".october-daily-section--compact-guidance").count(), 1);
    await frame.getByRole("button", { name: "Вернуть пояснения к заданиям", exact: true }).click();
    assert.equal(await frame.getByRole("button", { name: "Скрыть пояснение к заданиям дня", exact: true }).count(), 1);
    assert.equal(await frame.getByRole("button", { name: "Скрыть пояснение к клановой вылазке", exact: true }).count(), 1);
    await page.screenshot({ path: fileURLToPath(new URL(`screen-daily-initial-${width}.png`, directory)) });
    await frame.locator("#test-daily .compendium-quest").first().getByRole("button", { name: "Проверить", exact: true }).click();
    await frame.locator(".october-clan-quest").getByRole("button", { name: "Проверить", exact: true }).click();
    await frame.locator(".compendium-rune-picker select").selectOption("1");
    await frame.getByRole("button", { name: "Выбрать героя", exact: true }).click();
    await frame.locator(".compendium-rune-challenge").getByRole("button", { name: "Проверить", exact: true }).click();
    assert.equal(await frame.getByTestId("test-total").innerText(), "★ 7");
    const protection = await frame.evaluate(async () => {
      const blocked = {};
      for (const [name, read] of [["parent", () => parent.document.body], ["cookie", () => document.cookie], ["storage", () => localStorage.length]]) {
        try { read(); blocked[name] = false; } catch { blocked[name] = true; }
      }
      try { await fetch("/api/compendium/daily-quests/real/check", { method: "POST", credentials: "include" }); blocked.network = false; } catch { blocked.network = true; }
      return blocked;
    });
    assert.deepEqual(protection, { parent: true, cookie: true, storage: true, network: true });
    for (const section of ["Кланы", "Личный зачёт", "Гонка", "Задания"]) {
      await openSection(frame, section);
      await frame.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      const issues = await frame.evaluate(() => {
        const problems = [];
        if (document.documentElement.scrollWidth > innerWidth + 2) problems.push("horizontal page overflow");
        if (innerWidth > 960 && innerHeight >= 700) for (const section of document.querySelectorAll(".october-compendium-screen")) {
          for (const panel of section.querySelectorAll(".compendium-star-race,.compendium-daily-section,.october-clan-showcase,.compendium-rewards,.compendium-quest,.compendium-rune-challenge")) {
            const a = panel.getBoundingClientRect(), b = section.getBoundingClientRect();
            if (a.top < b.top - 2 || a.bottom > b.bottom + 2) problems.push(`${panel.className}: outside screen`);
            if (panel.scrollHeight > panel.clientHeight + 2) problems.push(`${panel.className}: clipped content`);
          }
        }
        return problems;
      });
      if (issues.length) {
        await page.screenshot({ path: fileURLToPath(new URL(`failure-${width}.png`, directory)) });
        console.log(await frame.locator("#test-daily .compendium-quest").first().evaluate((root) => [root, ...root.children].map((el) => ({ name: el.className, height: el.clientHeight, content: el.scrollHeight, top: Math.round(el.getBoundingClientRect().top), margin: getComputedStyle(el).margin, flex: getComputedStyle(el).flex }))));
      }
      assert.deepEqual(issues, [], `${section} at ${width} × ${height}`);
      await page.screenshot({ path: fileURLToPath(new URL(`screen-${section === "Кланы" ? "clans" : section === "Гонка" ? "race" : section === "Задания" ? "daily" : "personal"}-${width}.png`, directory)) });
    }
    await openSection(frame, "Кланы");
    const prizeImages = await frame.locator("img.october-clan-prize-slot-image").evaluateAll((images) => images.map((image) => image.getAttribute("src")));
    assert.equal(prizeImages.length, 30);
    assert.ok(prizeImages.every((source) => /\/prizes\/.*-thumbnail-[a-f0-9]+\.webp$/.test(source)), "Prize slots must use saved thumbnails");
    await frame.locator(".october-clan-prize-slot").first().hover();
    const popover = frame.locator(".october-clan-prize-popover img");
    await popover.waitFor();
    assert.match(await popover.getAttribute("src"), /\/prizes\/.*-preview-[a-f0-9]+\.webp$/);
    await frame.locator("h1").hover();
    for (const name of ["Морбус", "Панацея"]) {
      await frame.locator(`.october-clan-card--${name === "Морбус" ? "morbus" : "panacea"}`).getByRole("button", { name: "Полный зачёт клана" }).click();
      const dialog = frame.getByRole("dialog", { name });
      assert.equal(await dialog.locator("ol > li").count(), 20);
      assert.match(await dialog.innerText(), /20 участников/);
      await dialog.getByRole("button", { name: "Закрыть полный зачёт" }).click();
      await frame.getByRole("button", { name: `Активность клана ${name} за сегодня` }).click();
      assert.equal(await frame.locator("dialog[open] [role=row]").count(), 21);
      await frame.getByRole("button", { name: "Закрыть активность клана" }).click();
    }
    await frame.getByRole("button", { name: "Управление тестом", exact: true }).click();
    await frame.getByRole("button", { name: "Сбросить тест", exact: true }).click();
    assert.equal(await frame.getByTestId("test-total").innerText(), "★ 0");
    await openSection(frame, "Гонка");
    await frame.getByRole("button", { name: "Путь Разрушения (Core)", exact: true }).waitFor();
    assert.equal((await context.cookies()).find((cookie) => cookie.name === "main-session-sentinel").value, "protected");
    assert.deepEqual(browserErrors, [], "The initial test HTML must hydrate without errors");
    await context.close();
  }
  assert.deepEqual(violations, []);
  console.log("Full test compendium verified: four screens, local rewards/reset, saved prize thumbnails, opaque origin, no cookies/storage/parent access or working-data requests.");
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
