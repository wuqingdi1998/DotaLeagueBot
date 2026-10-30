import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const css = ["01-foundation.css", "03-site-footer.css"].map(name =>
  readFileSync(new URL(`app/styles/${name}`, root), "utf8")).join("\n");
const server = createServer((_request, response) => {
  response.setHeader("content-type", "text/html; charset=utf-8");
  response.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><main class="site-shell" data-theme="dark"><header style="height:66px;flex-shrink:0">Шапка сайта</header><section style="height:200px;flex-shrink:0">Содержимое страницы</section><footer class="site-footer">Нижнее меню</footer></main>`);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
mkdirSync(new URL(".data/footer-check/", root), { recursive: true });
try {
  for (const [width, height] of [[1900, 952], [1366, 768], [393, 852], [320, 740]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    for (const platform of [false, true]) {
      await page.locator("main").evaluate((node, platform) => {
        node.className = platform ? "site-shell platform-shell has-platform-footer" : "site-shell";
        node.querySelector("footer").className = platform ? "site-footer platform-footer" : "site-footer";
      }, platform);
      for (const theme of ["light", "dark"]) {
        await page.locator("main").evaluate((node, theme) => node.dataset.theme = theme, theme);
        for (const contentHeight of [200, height * 3]) {
          await page.locator("section").evaluate((node, height) => node.style.height = `${height}px`, contentHeight);
          await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
          const geometry = await page.evaluate(() => {
            const footer = document.querySelector("footer").getBoundingClientRect();
            const content = document.querySelector("section").getBoundingClientRect();
            return { bottom: footer.bottom + scrollY, top: footer.top + scrollY,
              contentBottom: content.bottom + scrollY,
              pageBottom: document.documentElement.scrollHeight, viewport: innerHeight,
              position: getComputedStyle(document.querySelector("footer")).position,
              overflow: document.documentElement.scrollWidth > innerWidth };
          });
          assert.ok(Math.abs(geometry.bottom - geometry.pageBottom) <= 1, JSON.stringify({ width, platform, contentHeight, geometry }));
          assert.ok(geometry.top >= geometry.contentBottom - 1);
          assert.ok(geometry.bottom >= geometry.viewport - 1);
          assert.ok(!["fixed", "absolute", "sticky"].includes(geometry.position));
          assert.equal(geometry.overflow, false);
          if (!platform && theme === "dark" && contentHeight === 200) {
            await page.screenshot({ path: fileURLToPath(new URL(`.data/footer-check/${width}.png`, root)) });
          }
        }
      }
    }
    await page.close();
  }
  console.log("Footer stays at the end of short and long pages on desktop and mobile in both themes.");
} finally {
  await browser.close();
  server.close();
}
