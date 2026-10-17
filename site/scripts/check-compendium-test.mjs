import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const directory = new URL(".data/compendium-test/", root);
const vite = await createViteServer({ configFile: false, root: fileURLToPath(root), server: { middlewareMode: true } });
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
  if (request.method !== "GET" || !pathname.startsWith("/compendium/")) violations.push(`${request.method} ${pathname}`);
  if (request.headers.cookie?.includes("main-session-sentinel")) violations.push(`Cookie sent by isolated frame: ${pathname}`);
  const file = new URL(`public${pathname}`, root);
  if (!existsSync(file)) { response.writeHead(404); response.end(); return; }
  response.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  for (const [width, height] of [[1900, 870], [1366, 768], [961, 700], [393, 852]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addCookies([{ name: "main-session-sentinel", value: "protected", url }]);
    const page = await context.newPage();
    await page.route("https://cdn.cloudflare.steamstatic.com/**", (route) => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#244352"/></svg>' }));
    await page.goto(`${url}/compendium/test`);
    const frame = page.frames().find((frame) => frame.parentFrame());
    await frame.getByRole("button", { name: "Гонка", exact: true }).click();
    await frame.getByRole("button", { name: "Путь Созидания (Support)", exact: true }).click();
    await frame.getByRole("button", { name: "Выполнить (тест)", exact: true }).click();
    assert.equal(await frame.getByTestId("test-total").innerText(), "★ 4");
    await frame.getByRole("button", { name: "Задания", exact: true }).click();
    await frame.locator("#test-daily .compendium-quest").first().getByRole("button", { name: "Проверить", exact: true }).click();
    await frame.getByRole("button", { name: "Выполнить вылазку (тест)", exact: true }).click();
    await frame.getByLabel("Любимый герой (тест)").selectOption("1");
    await frame.getByRole("button", { name: "Выбрать героя (тест)", exact: true }).click();
    await frame.getByRole("button", { name: "Выполнить руны (тест)", exact: true }).click();
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
      await frame.getByRole("button", { name: section, exact: true }).click();
      await frame.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      const issues = await frame.evaluate(() => {
        const problems = [];
        if (document.documentElement.scrollWidth > innerWidth + 2) problems.push("horizontal page overflow");
        if (innerWidth > 960 && innerHeight >= 700) for (const section of document.querySelectorAll(".october-compendium-screen")) {
          for (const panel of section.querySelectorAll(".compendium-star-race,.compendium-daily-section,.october-clan-showcase,.compendium-rewards")) {
            const a = panel.getBoundingClientRect(), b = section.getBoundingClientRect();
            if (a.top < b.top - 2 || a.bottom > b.bottom + 2) problems.push(`${panel.className}: outside screen`);
            if (panel.scrollHeight > panel.clientHeight + 2) problems.push(`${panel.className}: clipped content`);
          }
        }
        return problems;
      });
      if (issues.length) {
        await page.screenshot({ path: fileURLToPath(new URL(`failure-${width}.png`, directory)) });
        console.log(await frame.locator("#test-clans").evaluate((root) => [...root.querySelectorAll("div,section")].map((el) => ({ name: el.className, height: el.clientHeight, content: el.scrollHeight, top: Math.round(el.getBoundingClientRect().top) })).filter((el) => el.height > 100)));
      }
      assert.deepEqual(issues, [], `${section} at ${width} × ${height}`);
      await page.screenshot({ path: fileURLToPath(new URL(`screen-${section === "Кланы" ? "clans" : section === "Гонка" ? "race" : section === "Задания" ? "daily" : "personal"}-${width}.png`, directory)) });
    }
    await frame.getByRole("button", { name: "Сбросить тест", exact: true }).click();
    assert.equal(await frame.getByTestId("test-total").innerText(), "★ 0");
    await frame.getByRole("button", { name: "Гонка", exact: true }).click();
    await frame.getByRole("button", { name: "Путь Разрушения (Core)", exact: true }).waitFor();
    assert.equal((await context.cookies()).find((cookie) => cookie.name === "main-session-sentinel").value, "protected");
    await context.close();
  }
  assert.deepEqual(violations, []);
  console.log("Full test compendium verified: four screens, local rewards/reset, opaque origin, no cookies/storage/parent access or live requests.");
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
