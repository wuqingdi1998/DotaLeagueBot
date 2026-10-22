import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const directory = new URL(".data/clan-activity/", root);
mkdirSync(directory, { recursive: true });
// Next's routing and image optimization are outside this isolated interaction check.
for (const [name, tag] of [["link", "a"], ["image", "img"]]) {
  writeFileSync(new URL(`${name}.js`, directory), `import { createElement } from 'react'; export default function Component({children, ...props}) { return createElement('${tag}', props, children); }`);
}
await build({
  configFile: false, root: fileURLToPath(root), logLevel: "error",
  resolve: { alias: { "@": fileURLToPath(new URL("./", root)), "next/link": fileURLToPath(new URL("link.js", directory)), "next/image": fileURLToPath(new URL("image.js", directory)) } },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: { outDir: fileURLToPath(new URL("bundle/", directory)), emptyOutDir: true,
    lib: { entry: fileURLToPath(new URL("tests/clan-activity-browser.tsx", root)), formats: ["iife"], name: "ActivityCheck", fileName: () => "activity.js" } },
});
const styles = new URL("app/styles/", root);
const names = ["01-foundation.css", ...[...readFileSync(new URL("compendium-route.css", styles), "utf8").matchAll(/@import "\.\/(.*?)";/g)].map((match) => match[1])];
const css = names.map((name) => readFileSync(new URL(name, styles), "utf8")).join("\n");
const server = createServer((request, response) => {
  if (request.url === "/activity.js") {
    response.setHeader("content-type", "text/javascript");
    response.end(readFileSync(new URL("bundle/activity.js", directory)));
  } else if (request.url.startsWith("/compendium/")) {
    response.setHeader("content-type", "image/png");
    response.end(readFileSync(new URL(`public${request.url}`, root)));
  } else {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}body {padding:24px}</style><div class="site-shell" data-theme="dark" id="root"></div><script src="/activity.js"></script>`);
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
const labels = ["ГЗЗ", "И1", "И2", "И3", "ИР"];
function data(isNewDay = false) {
  return { dateLabel: isNewDay ? "15 октября 2026 г." : "14 октября 2026 г.", isActive: true,
    serverNow: "2026-10-14T20:59:59.000Z", resetsAt: "2026-10-14T21:00:00.000Z",
    members: isNewDay ? [] : ["morbus", "panacea"].flatMap((clanId) => Array.from({ length: 20 }, (_, index) => ({
      discordId: `${clanId}-${index}`, dotaId: String(index), playerName: `Очень длинный ник участника ${index}`,
      clanId, avatarUrl: null, totalPoints: 100, dailyStars: 25 - index,
      quests: labels.map((label, position) => ({ label, description: position === 0 ? "Победите в рейтинговом матче. Задание гонки" : `Испытание ${position}`,
        rewardStars: position === 0 ? 3 : 2, isCompleted: position % 2 === 0, isAvailable: position !== 4 })),
    }))) };
}
try {
  for (const width of [1900, 1366, 393, 320]) {
    const page = await browser.newPage({ viewport: { width, height: width > 1000 ? 870 : 852 } });
    if (width === 320) {
      const beforeMidnight = new Date("2026-10-14T20:59:59Z");
      await page.clock.install({ time: beforeMidnight });
      await page.clock.pauseAt(beforeMidnight);
    }
    let requests = 0;
    let shouldFail = false;
    await page.route("**/api/compendium/october/clan-activity", async (route) => {
      requests++;
      const body = data(requests > 1);
      if (width !== 320) body.resetsAt = "2026-10-15T21:00:00.000Z";
      await route.fulfill({ status: shouldFail ? 500 : 200, json: body });
    });
    await page.goto(url);
    const tabs = page.locator(".october-clan-activity-tab");
    assert.equal(await tabs.count(), 2);
    assert.equal(await tabs.locator("svg").count(), 0);
    const tabGeometry = await page.locator(".october-clan-lead").evaluate((lead) => {
      const panel = lead.querySelector(".october-clan-lead-panel").getBoundingClientRect();
      const left = lead.querySelector(".october-clan-activity-tab--left").getBoundingClientRect();
      const right = lead.querySelector(".october-clan-activity-tab--right").getBoundingClientRect();
      return left.left < panel.left && right.right > panel.right && left.height === panel.height && right.height === panel.height;
    });
    assert.ok(tabGeometry, `Side tabs must frame the lead panel at ${width}`);
    await page.locator(".october-clan-lead").screenshot({ path: fileURLToPath(new URL(`tabs-${width}.png`, directory)) });
    await page.getByRole("button", { name: "Активность клана Морбус за сегодня", exact: true }).click();
    const dialog = page.locator(".october-clan-activity-dialog[open]");
    await dialog.getByRole("table").waitFor();
    assert.equal(await dialog.getByRole("columnheader").allTextContents().then((text) => text.slice(2).join(" ")), "ГЗЗ И1 И2 И3 ИР");
    assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
    const circles = dialog.locator(".october-clan-activity-circle");
    assert.equal(await circles.count(), 100);
    assert.equal(await circles.first().evaluate((element) => element.firstChild.textContent), "3");
    assert.equal(await circles.nth(4).getAttribute("aria-disabled"), "true");
    await circles.first().hover();
    await circles.first().getByRole("tooltip").waitFor({ state: "visible" });
    assert.match(await circles.first().getByRole("tooltip").textContent(), /Задание гонки/);
    const sizes = await dialog.evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth,
      rows: [...element.querySelectorAll(".october-clan-activity-row")].every((row) => row.scrollWidth <= row.clientWidth + 1) }));
    assert.ok(sizes.scroll <= sizes.width + 1 && sizes.rows, `Dialog overflows at ${width}`);
    await page.screenshot({ path: fileURLToPath(new URL(`activity-${width}.png`, directory)) });
    if (width === 320) {
      await page.clock.runFor(1001);
      await dialog.getByText("Сегодня в этом клане ещё никто не заработал звёзд.").waitFor();
      assert.equal(await dialog.getByRole("row").count(), 1);
    }
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.body.style.overflow === "");
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
    shouldFail = true;
    await page.getByRole("button", { name: "Активность клана Панацея за сегодня", exact: true }).click();
    await page.getByRole("alert").waitFor();
    shouldFail = false;
    await page.getByRole("button", { name: "Повторить", exact: true }).click();
    await dialog.getByText("Сегодня в этом клане ещё никто не заработал звёзд.").waitFor();
    await page.getByRole("button", { name: "Закрыть активность клана", exact: true }).click();
    await page.getByRole("button", { name: "Полный зачёт клана", exact: true }).click();
    await page.getByRole("dialog", { name: "Морбус", exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.body.style.overflow === "");
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
    await page.getByRole("button", { name: "Как получить звёзды?", exact: true }).click();
    const guide = page.locator(".october-star-guide-dialog[open]");
    assert.match(await guide.innerText(), /6-й, 7-й, 8-й и 9-й туры/);
    assert.equal(await guide.getByText("CD Fastcup #8", { exact: true }).count(), 0);
    const league = guide.locator(".october-star-guide-item").filter({ hasText: "Туры сезонной лиги" });
    const fastcup = guide.locator(".october-star-guide-item").filter({ hasText: "Fastcup #14" });
    assert.equal(await league.locator(":scope > strong").getAttribute("aria-label"), "Максимум 24 звёзд");
    assert.equal(await fastcup.locator(":scope > strong").getAttribute("aria-label"), "Максимум 6 звёзд");
    assert.equal(await guide.evaluate((element) => element.scrollWidth > element.clientWidth), false);
    await guide.screenshot({ path: fileURLToPath(new URL(`star-guide-${width}.png`, directory)) });
    await page.keyboard.press("Escape");
    await page.close();
  }
  console.log("Clan side tabs, daily reset, rewards, tooltips, retry and dialogs verified on desktop and mobile.");
} finally {
  await browser.close();
  server.close();
}
