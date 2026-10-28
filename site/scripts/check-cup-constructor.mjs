import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const directory = new URL(".data/cup-constructor/", root);
mkdirSync(directory, { recursive: true });
await build({
  configFile: false, root: fileURLToPath(root), logLevel: "error",
  resolve: { alias: { "@": fileURLToPath(root) } },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: fileURLToPath(new URL("bundle/", directory)), emptyOutDir: true,
    lib: { entry: fileURLToPath(new URL("tests/cup-constructor-browser.tsx", root)), formats: ["iife"], name: "CupCheck", fileName: () => "preview.js" },
  },
});
const css = ["01-foundation.css", "76-cup-constructor.css"].map((name) => readFileSync(new URL(`app/styles/${name}`, root), "utf8")).join("\n");
const server = createServer((request, response) => {
  if (request.url === "/preview.js") {
    response.setHeader("content-type", "text/javascript");
    response.end(readFileSync(new URL("bundle/preview.js", directory)));
  } else {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#07151f}button{font-family:inherit}${css}</style><main data-theme="dark"><div id="root"></div></main><script src="/preview.js"></script>`);
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  for (const [width, height] of [[1900, 870], [1366, 768], [393, 852], [320, 740]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const players = Array.from({ length: 45 }, (_, i) => ({
      id: String(i + 1), nickname: i === 0 ? "ОченьДлинныйНикнеймУчастника_1234567890" : `Player ${i + 1}`,
      tier: i % 12 + 1, positions: i === 2 ? "1/2/3/4/5" : "2/4", matchCount: i === 44 ? 0 : 3,
    }));
    let board = { pool: players.slice(0, 44).map((p) => p.id), baskets: Array.from({ length: 4 }, () => Array(6).fill(null)), readyPlayerIds: [] };
    let revision = 0;
    let shouldFail = false;
    let shouldConflict = false;
    let saveCount = 0;
    await page.route("**/api/admin/cup-constructor", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: { board, revision, players, leagueName: "Лига: сезон 9" } });
      if (shouldFail) return route.fulfill({ status: 503, json: { error: "Нет связи" } });
      if (shouldConflict) return route.fulfill({ status: 409, json: { error: "Расстановка изменена в другой вкладке" } });
      const body = route.request().postDataJSON();
      assert.equal(body.revision, revision);
      await new Promise((resolve) => setTimeout(resolve, 40));
      board = body.board;
      saveCount++;
      return route.fulfill({ json: { revision: ++revision } });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const saved = () => page.getByRole("status").filter({ hasText: "Все изменения сохранены" }).waitFor();
    await saved();
    async function select(id) { await page.getByRole("button", { name: `Выбрать игрока ${players[Number(id) - 1].nickname}`, exact: true }).click(); }
    async function place(id, basket, slot) {
      await select(id);
      await page.getByRole("button", { name: `Корзина ${basket}, слот ${slot}: поставить игрока`, exact: true }).click();
      await saved();
    }
    await place("3", 1, 6);
    await place("2", 1, 3);
    await place("1", 1, 1);
    assert.deepEqual(board.baskets[0], ["1", null, "2", null, null, "3"]);
    assert.equal(await page.locator('[data-tier-total="0"]').textContent(), "3");
    const readiness = page.getByRole("button", { name: `Готовность: ${players[0].nickname}`, exact: true });
    await readiness.click();
    await saved();
    assert.equal(await readiness.getAttribute("aria-pressed"), "true");
    await readiness.click();
    await saved();
    assert.equal(await readiness.getAttribute("aria-pressed"), "false");
    await readiness.click();
    await saved();
    if (width > 1000) {
      async function dragToSlot(basket, slot) {
        await page.locator('[data-player-id="2"]').evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
        const source = await page.locator('[data-player-id="2"]').boundingBox();
        const target = await page.locator(`[data-basket="${basket}"][data-slot="${slot}"]`).boundingBox();
        await page.mouse.move(source.x + 5, source.y + 5);
        await page.mouse.down();
        await page.mouse.move(source.x + 20, source.y + 20, { steps: 5 });
        await page.mouse.move(target.x + 10, target.y + 10, { steps: 15 });
        await page.mouse.up();
      }
      await dragToSlot(1, 4);
      await saved();
      assert.equal(board.baskets[1][4], "2");
      assert.equal(board.baskets[0][2], null);
      await dragToSlot(0, 5);
      await saved();
      assert.equal(board.baskets[0][5], "2");
      assert.equal(board.baskets[1][4], "3");
    }
    await select("4");
    await page.getByRole("button", { name: `Поставить перед ${players[4].nickname}`, exact: true }).click();
    await saved();
    assert.ok(board.pool.indexOf("4") < board.pool.indexOf("5"));
    await page.getByRole("button", { name: "Убрать из конструктора: Player 4", exact: true }).click();
    await saved();
    assert.ok(!board.pool.includes("4"));
    await page.getByText("Добавить участника", { exact: true }).click();
    await page.getByPlaceholder("Найти игрока").fill("Player 45");
    await page.locator(".cup-picker-results button").click();
    await saved();
    assert.ok(board.pool.includes("45"));
    await page.reload();
    await saved();
    assert.equal(await page.getByRole("button", { name: `Готовность: ${players[0].nickname}`, exact: true }).getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator('[data-basket="0"][data-slot="0"] [data-player-id="1"]').count(), 1);
    const countsBefore = saveCount;
    await page.getByRole("button", { name: "Готовность: Player 5", exact: true }).click();
    await page.getByRole("button", { name: "Готовность: Player 6", exact: true }).click();
    await saved();
    assert.ok(saveCount > countsBefore);
    assert.ok(board.readyPlayerIds.includes("5") && board.readyPlayerIds.includes("6"));
    shouldFail = true;
    await page.getByRole("button", { name: "Готовность: Player 5", exact: true }).click();
    await page.getByRole("alert").waitFor();
    assert.ok(board.readyPlayerIds.includes("5"));
    shouldFail = false;
    await page.getByRole("button", { name: "Повторить", exact: true }).click();
    await saved();
    assert.ok(!board.readyPlayerIds.includes("5"));
    shouldConflict = true;
    await page.getByRole("button", { name: "Готовность: Player 5", exact: true }).click();
    await page.getByRole("alert").waitFor();
    shouldConflict = false;
    await page.getByRole("button", { name: "Загрузить сохранённую версию" }).click();
    await saved();
    assert.equal(await page.getByRole("button", { name: "Готовность: Player 5", exact: true }).getAttribute("aria-pressed"), "false");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: fileURLToPath(new URL(`cup-${width}.png`, directory)), fullPage: true });
    await page.locator("main").evaluate((element) => { element.dataset.theme = "light"; });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: fileURLToPath(new URL(`cup-light-${width}.png`, directory)), fullPage: true });
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log("Cup constructor: desktop/phone, independent slots, tier sums, drag, readiness, manual additions, persistence and failed saves passed");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
