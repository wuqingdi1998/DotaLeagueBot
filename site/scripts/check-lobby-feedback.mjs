import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const directory = new URL(".data/lobby-feedback/", root);
mkdirSync(directory, { recursive: true });
writeFileSync(new URL("image.js", directory), "import { createElement } from 'react'; export default function Image({unoptimized,priority,fill,style,...props}) { return createElement('img',{...props, style:fill?{...style,position:'absolute',inset:0,width:'100%',height:'100%'}:style}); }");
await build({
  configFile: false, root: fileURLToPath(root), logLevel: "error",
  resolve: { alias: { "@": fileURLToPath(root), "next/image": fileURLToPath(new URL("image.js", directory)) } },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: { outDir: fileURLToPath(new URL("bundle/", directory)), emptyOutDir: true,
    lib: { entry: fileURLToPath(new URL("tests/lobby-feedback-browser.tsx", root)), formats: ["iife"], name: "LobbyFeedbackCheck", fileName: () => "feedback.js" } },
});
const styles = new URL("app/styles/", root);
const imports = [...readFileSync(new URL("fearless-draft-route.css", styles), "utf8").matchAll(/@import "\.\/(.*?)";/g)].map((match) => match[1]);
const css = ["01-foundation.css", ...imports, "60-season-lobby-entry-and-shell.css", "60-season-lobby-room.css", "60-season-captain-voting.css"]
  .map((name) => readFileSync(new URL(name, styles), "utf8")).join("\n");
const server = createServer((request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/feedback.js") {
    response.setHeader("content-type", "text/javascript");
    response.end(readFileSync(new URL("bundle/feedback.js", directory)));
  } else if (pathname.startsWith("/api/compendium/heroes/")) {
    response.setHeader("content-type", "image/svg+xml");
    response.end('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="176"><rect width="100" height="176" fill="#244352"/></svg>');
  } else {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div class="site-shell" data-theme="dark" id="root"></div><script src="/feedback.js"></script>`);
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  for (const [width, height] of [[1366, 768], [393, 852]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const open = (mode) => page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}`);
    const screenshot = (name) => page.screenshot({ path: fileURLToPath(new URL(`${name}-${width}.png`, directory)), fullPage: true });
    const assertFits = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No horizontal overflow");
    await open("interest");
    await page.locator(".season-room-interest-actions").getByRole("button", { name: "Нет", exact: true }).click();
    await page.locator(".season-room-vote-confirmation").getByRole("button", { name: "Да", exact: true }).click();
    await page.getByText("Сохраняем ответ…", { exact: true }).waitFor();
    assert.equal(await page.getByText("Вы не хотите быть капитаном", { exact: true }).count(), 0);
    await page.getByRole("button", { name: "Сервер: ошибка", exact: true }).click();
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByText("Ответ сохранён", { exact: true }).count(), 0);
    await page.locator(".season-room-vote-confirmation").getByRole("button", { name: "Да", exact: true }).click();
    await page.getByRole("button", { name: "Сервер: успешно", exact: true }).click();
    await page.getByText("Вы не хотите быть капитаном", { exact: true }).waitFor();
    await page.getByText("Оппонент делает выбор", { exact: true }).waitFor();
    assert.equal(await page.locator(".season-room-voting button").count(), 0);
    await assertFits();
    await screenshot("refused");
    await open("saved");
    await page.getByText("Вы не хотите быть капитаном", { exact: true }).waitFor();
    assert.equal(await page.locator(".season-room-voting button").count(), 0);
    await open("all");
    await page.getByText("Ответы получены. Переходим к следующему этапу.", { exact: true }).waitFor();
    assert.equal(await page.getByText("Оппонент делает выбор", { exact: true }).count(), 0);
    await assertFits();
    for (const action of ["BAN", "PICK"]) {
      await open(action);
      await page.getByRole("button", { name: "Axe", exact: true }).click();
      const confirm = page.locator(".fearless-hero-confirm > button");
      await confirm.click();
      const label = action === "BAN" ? "Бан сохраняется…" : "Пик сохраняется…";
      await page.locator(".fearless-hero-confirm-action").filter({ hasText: label }).waitFor();
      assert.equal(await confirm.isDisabled(), true);
      await confirm.evaluate((button) => button.click());
      assert.equal(await page.getByTestId("requests").innerText(), "1", "Duplicate selection suppressed");
      await assertFits();
      await screenshot(`saving-${action.toLowerCase()}`);
      await page.getByRole("button", { name: "Сервер: ошибка", exact: true }).click();
      await page.getByRole("alert").waitFor();
      assert.equal(await confirm.isDisabled(), false, "Failed action can be retried");
      assert.equal(await page.getByText(label, { exact: true }).count(), 0);
      await confirm.click();
      assert.equal(await page.getByTestId("requests").innerText(), "2");
    }
    assert.deepEqual(errors, [], "No browser errors");
    await page.close();
  }
  console.log("Lobby feedback: refusal, reload, pending/error/retry, opponent waiting and ban/pick duplicate protection passed at 1366px and 393px.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
