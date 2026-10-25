import { chromium } from "playwright";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const directory = new URL(".data/october-layout/", root);
const fixturePrefix = process.argv.find((argument) => argument.startsWith("--fixture="))?.slice(10);
const requestedWidth = Number(process.argv.find((argument) => argument.startsWith("--width="))?.slice(8));
const requestedHeight = Number(process.argv.find((argument) => argument.startsWith("--height="))?.slice(9));
const fixtures = JSON.parse(readFileSync(new URL("manifest.json", directory), "utf8")).filter((name) => !fixturePrefix || name.startsWith(fixturePrefix));
if (!fixtures.length) throw new Error("Unknown layout fixture");
const screenshots = new URL("screenshots/", directory);
mkdirSync(screenshots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
const failures = [];
try {
  const viewports = [[1900, 870], [1920, 1080], [1788, 819], [1536, 864], [1366, 768], [1280, 720], [1024, 768], [961, 700], [961, 741], [1280, 700], [1920, 700], [1920, 741], [768, 1024], [393, 852]]
    .filter(([width, height]) => (!requestedWidth || width === requestedWidth) && (!requestedHeight || height === requestedHeight));
  if (!viewports.length) throw new Error("Unknown layout viewport");
  for (let start = 0; start < viewports.length; start += 3) {
    await Promise.all(viewports.slice(start, start + 3).map(async ([width, height]) => {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.route("https://layout.test/**", (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/_next/image") url.pathname = url.searchParams.get("url");
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
        const issues = await page.evaluate((fixture) => {
          const issues = [];
          const desktop = innerWidth > 960 && innerHeight >= 700;
          const section = document.querySelector(".october-compendium-screen");
          if (!section) {
            if (document.documentElement.scrollWidth > innerWidth) issues.push("results page overflows horizontally");
            for (const element of document.querySelectorAll(".compendium-personal-results article,.compendium-clan-result,.compendium-clan-prize-result,.compendium-clan-prize-table td,.compendium-race-result,.compendium-verification-requests article,.profile-badges-card,.profile-badges-list")) {
              if (element.scrollWidth > element.clientWidth + 2) issues.push("result card clips content");
            }
            if (fixture.startsWith("results-october")) {
              const results = document.querySelector(".compendium-results-page");
              if (results.textContent.includes("прогноз")) issues.push("October results must not show predictions");
              if (document.querySelectorAll(".compendium-results-row").length !== 25) issues.push("results must retain the top ten and all three weekly top fives");
              if (fixture === "results-october" && innerWidth >= 1280 && document.documentElement.scrollHeight > innerHeight * 2) issues.push(`results height ${document.documentElement.scrollHeight} exceeds two screens (${innerHeight * 2})`);
              for (const heading of results.querySelectorAll('[role="columnheader"]')) {
                const range = document.createRange();
                range.selectNodeContents(heading);
                const text = range.getBoundingClientRect();
                const cell = heading.getBoundingClientRect();
                if (text.left < cell.left - 1 || text.right > cell.right + 1) issues.push("result column heading is clipped");
              }
              if (document.querySelectorAll(".compendium-clan-prize-table tbody tr").length !== 30) issues.push("clan draw must show all 30 recipients");
              for (const number of document.querySelectorAll(".compendium-clan-prize-table tbody td:first-child")) {
                const range = document.createRange();
                range.selectNodeContents(number);
                if (range.getClientRects().length !== 1) issues.push("prize number wraps across lines");
              }
              for (const table of document.querySelectorAll(".compendium-clan-prize-table")) {
                const heading = table.querySelector("th:last-child");
                const recipient = table.querySelector("tbody td:last-child strong").getBoundingClientRect();
                const headingStart = heading.getBoundingClientRect().left + parseFloat(getComputedStyle(heading).paddingLeft);
                if (Math.abs(headingStart - recipient.left) > 1) issues.push("recipient column is misaligned");
              }
            }
            return issues;
          }
          const bounds = section.getBoundingClientRect();
          const lead = document.querySelector(".october-clan-lead");
          if (lead) {
            const board = document.querySelector(".october-clan-prize-board").getBoundingClientRect();
            const rect = lead.getBoundingClientRect();
            if (rect.left < board.left || rect.right > board.right || rect.top < board.top || rect.bottom > board.bottom) issues.push("clan lead is outside the prize board");
            if (lead.scrollWidth > lead.clientWidth + 2) issues.push("clan lead clips text");
            if (rect.width > 260) issues.push("clan lead has excessive empty width");
            if (innerWidth > 1200) {
              const copy = document.querySelector(".october-clan-prize-copy").getBoundingClientRect();
              if (rect.left < copy.right - 2) issues.push("clan lead is not to the right of prize copy");
            }
            if (desktop && board.bottom > bounds.bottom + 2) issues.push("clan prizes exceed the screen");
            if (innerWidth > 1200 && rect.right > document.querySelector(".october-clan-prize-lists").getBoundingClientRect().left) issues.push("clan lead is not to the left of prizes");
            for (const card of document.querySelectorAll(".october-clan-card")) {
              if (desktop && card.getBoundingClientRect().bottom > bounds.bottom + 2) issues.push("clan card exceeds the screen");
              if (card.scrollHeight > card.clientHeight + 2) issues.push("clan card clips content");
            }
          }
          if (document.documentElement.scrollWidth > innerWidth) issues.push("page overflows horizontally");
          if (desktop && bounds.height > innerHeight - 76 + 2) issues.push(`screen height ${bounds.height} exceeds ${innerHeight - 76}`);
          const selectors = [".compendium-star-race", ".compendium-star-race-quest", ".compendium-daily-section", ".compendium-quest", ".compendium-rune-challenge", ".october-daily-countdown"];
          for (const element of document.querySelectorAll(selectors.join(","))) {
            if (fixture.startsWith("race-two-paths") && element.scrollWidth > element.clientWidth + 2) issues.push(`${element.className}: preview content overflows horizontally`);
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
        }, fixture);
        if (issues.length) failures.push({ fixture, width, height, issues });
        if (fixture === "race-1-5" && width === 1366) {
          await page.locator(".compendium-star-race-quest").nth(2).locator(".october-race-matches-button").click();
          const evidence = page.locator(".october-race-matches-popover:popover-open");
          if (!await evidence.isVisible() || await evidence.locator("a").count() === 0) {
            failures.push({ fixture, width, height, issues: ["completed match evidence does not open"] });
          }
          if (await evidence.locator("p").count()) failures.push({ fixture, width, height, issues: ["complete non-stat quest incorrectly says evidence needs repair"] });
          await page.keyboard.press("Escape");
        }
        if (fixture === "race-0-4" && [1900, 1366, 393].includes(width)) {
          const card = page.locator(".compendium-star-race-quest").nth(1);
          await card.getByRole("button", { name: "Матчи: 2", exact: true }).click();
          const evidence = page.locator(".october-race-matches-popover:popover-open");
          if (!await evidence.isVisible() || await evidence.locator("a").count() !== 2) {
            failures.push({ fixture, width, height, issues: ["building damage evidence does not show all contributing matches"] });
          }
          if (!await evidence.locator("p").count()) failures.push({ fixture, width, height, issues: ["legacy building evidence does not show its restoration status"] });
          await page.screenshot({ path: fileURLToPath(new URL(`race-evidence-${width}.png`, screenshots)), fullPage: true });
          await page.keyboard.press("Escape");
        }
        if (["race-path-choice", "race-two-paths-4-active", "race-two-paths-support-4-active", "race-two-paths-3-active", "race-two-paths-6-completed", "clans-morbus", "race-0-4", "daily-completed-compact", "daily-change-guidance", "verification-queue", "profile-badges"].includes(fixture) && [1900, 1366, 393].includes(width)) {
          await page.screenshot({ path: fileURLToPath(new URL(`${fixture}-${width}.png`, screenshots)), fullPage: true });
        }
        if ((fixture.startsWith("results-") || fixture.startsWith("clans-")) && [1900, 1366, 393].includes(width)) {
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
