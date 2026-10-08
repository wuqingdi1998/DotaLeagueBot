import { chromium } from "playwright";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const directory = new URL(".data/october-layout/", root);
const fixtures = JSON.parse(readFileSync(new URL("manifest.json", directory), "utf8"));
const screenshots = new URL("screenshots/", directory);
mkdirSync(screenshots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
const failures = [];
try {
  const viewports = [[1900, 870], [1920, 1080], [1788, 819], [1536, 864], [1366, 768], [1280, 720], [1024, 768], [961, 700], [961, 741], [1280, 700], [1920, 700], [1920, 741], [768, 1024], [393, 852]];
  for (let start = 0; start < viewports.length; start += 3) {
    await Promise.all(viewports.slice(start, start + 3).map(async ([width, height]) => {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.route("https://layout.test/**", (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith("/api/compendium/heroes/")) {
          return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="164" height="92"><rect width="164" height="92" fill="#244352"/></svg>' });
        }
        const file = url.pathname.endsWith(".html") ? new URL(url.pathname.slice(1), directory) : new URL(`public${url.pathname}`, root);
        if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
        return route.fulfill({ body: readFileSync(file), contentType: url.pathname.endsWith(".html") ? "text/html" : undefined });
      });
      for (const fixture of fixtures) {
        await page.goto(`https://layout.test/${fixture}.html`, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        const issues = await page.evaluate(() => {
          const issues = [];
          const desktop = innerWidth > 960 && innerHeight >= 700;
          const section = document.querySelector(".october-compendium-screen");
          const bounds = section.getBoundingClientRect();
          if (document.documentElement.scrollWidth > innerWidth) issues.push("page overflows horizontally");
          if (desktop && bounds.height > innerHeight - 76 + 2) issues.push(`screen height ${bounds.height} exceeds ${innerHeight - 76}`);
          const selectors = [".compendium-star-race", ".compendium-star-race-quest", ".compendium-daily-section", ".compendium-quest", ".compendium-rune-challenge", ".october-daily-countdown"];
          for (const element of document.querySelectorAll(selectors.join(","))) {
            if (element.scrollHeight > element.clientHeight + 2) issues.push(`${element.className}: content height ${element.scrollHeight} exceeds ${element.clientHeight}`);
            const rect = element.getBoundingClientRect();
            if (desktop && (rect.bottom > bounds.bottom + 2 || rect.top < bounds.top - 2)) issues.push(`${element.className}: outside its screen`);
          }
          if (desktop) {
            for (const element of document.querySelectorAll(".compendium-star-race,.compendium-daily-section")) {
              const rect = element.getBoundingClientRect();
              if (Math.abs((rect.top + rect.bottom) - (bounds.top + bounds.bottom)) > 4) issues.push(`${element.className}: panel is not vertically centered`);
            }
            if (innerWidth >= 1500 && innerHeight >= 800) {
              const active = document.querySelector(".compendium-star-race-quest.active");
              if (active?.querySelector(".compendium-star-race-heroes") && active.querySelector(".compendium-star-race-action .compendium-star-race-progress")) {
                const action = active.querySelector(".compendium-star-race-action");
                if (action.getBoundingClientRect().top - action.previousElementSibling.getBoundingClientRect().bottom > 24) issues.push("active race card stretches with unnecessary empty space");
              }
              const grid = document.querySelector(".compendium-quest-grid");
              if (grid && grid.getBoundingClientRect().height > bounds.height * 0.65) issues.push("daily cards stretch beyond the previous compact composition");
            }
            for (const element of document.querySelectorAll(".compendium-star-race-quests,.compendium-quest-grid")) {
              if (element.scrollWidth > element.clientWidth + 2) issues.push(`${element.className}: horizontal scrollbar`);
            }
          }
          return issues;
        });
        if (issues.length) failures.push({ fixture, width, height, issues });
        if (fixture === "race-1-5" && width === 1366) {
          await page.locator(".october-race-matches-button").first().click();
          const evidence = page.locator(".october-race-matches-popover:popover-open");
          if (!await evidence.isVisible() || await evidence.locator("a").count() === 0) {
            failures.push({ fixture, width, height, issues: ["completed match evidence does not open"] });
          }
          await page.keyboard.press("Escape");
        }
        if (["race-0-4", "daily-completed-compact", "daily-change-guidance"].includes(fixture) && [1900, 1366, 393].includes(width)) {
          await page.screenshot({ path: fileURLToPath(new URL(`${fixture}-${width}.png`, screenshots)), fullPage: true });
        }
      }
      console.log(`Checked ${fixtures.length} states at ${width} × ${height}`);
      await page.close();
    }));
  }
} finally {
  await browser.close();
}
writeReport();
function writeReport() {
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  } else console.log("All October screens fit; no clipped cards or desktop scrollbars.");
}
