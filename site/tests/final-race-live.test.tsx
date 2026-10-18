import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { chromium } from "playwright";
import { expect, it } from "vitest";
import { OCTOBER_COMPENDIUM_WEEKS } from "@/app/compendium/model/october-star-race";
import { finalRaceQuests, FINAL_RACE_PATHS, type FinalRacePath } from "@/app/compendium/model/final-star-race-definitions";
import { octoberRacePreviewData } from "@/app/organizer/compendium-october/model/preview";

it("confirms and saves either live path once, then shows its sorted Wednesday heroes on desktop and phone", async () => {
  const root = new URL("../", import.meta.url);
  const directory = new URL(".data/final-race-live/", root);
  mkdirSync(directory, { recursive: true });
  writeFileSync(new URL("image.js", directory), "import {createElement} from 'react'; export default function Image({fill,unoptimized,priority,quality,...props}) { return createElement('img',props); }");
  await build({ configFile: false, root: fileURLToPath(root), logLevel: "error",
    oxc: { jsx: { development: false } },
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    resolve: { alias: { "@": fileURLToPath(root), "next/image": fileURLToPath(new URL("image.js", directory)),
      "next/link": fileURLToPath(new URL("app/compendium/test/runtime/link.tsx", root)),
      "next/navigation": fileURLToPath(new URL("app/compendium/test/runtime/navigation.ts", root)) } },
    build: { outDir: fileURLToPath(new URL("bundle/", directory)), emptyOutDir: true, copyPublicDir: false,
      lib: { entry: fileURLToPath(new URL("tests/final-race-live-browser.tsx", root)), formats: ["iife"], name: "FinalRaceLive", fileName: () => "live.js" } },
  });
  const styleRoot = new URL("app/styles/", root);
  const styleNames = ["01-foundation.css", ...[...readFileSync(new URL("compendium-route.css", styleRoot), "utf8").matchAll(/@import "\.\/(.*?)";/g)].map((match) => match[1])];
  const css = styleNames.map((name) => readFileSync(new URL(name, styleRoot), "utf8")).join("\n");
  const week = OCTOBER_COMPENDIUM_WEEKS[2];
  const posts: string[] = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url!, "http://localhost");
    if (request.method === "POST") {
      posts.push(url.pathname);
      const body: Buffer[] = [];
      for await (const chunk of request) body.push(Buffer.from(chunk));
      const path: FinalRacePath = JSON.parse(Buffer.concat(body).toString()).path;
      const race = octoberRacePreviewData({ ...week, quests: finalRaceQuests(path) });
      race.title = FINAL_RACE_PATHS.find(({ id }) => id === path)!.raceTitle;
      race.phase = "active";
      race.pathSelection = { path, selectedOn: "2026-10-21", canChoose: true };
      race.quests = race.quests.map((quest, day) => ({ ...quest, phase: day === 2 ? "active" : day < 2 ? "finished" : "upcoming" }));
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ ok: true, starRace: race }));
    } else if (url.pathname === "/live.js") {
      response.setHeader("content-type", "text/javascript");
      response.end(readFileSync(new URL("bundle/live.js", directory)));
    } else if (url.pathname.startsWith("/compendium/") || url.pathname.startsWith("/api/compendium/heroes/")) {
      response.setHeader("content-type", "image/svg+xml");
      response.end('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#244352"/></svg>');
    } else {
      const fixture = { week, serverNow: "2026-10-21T12:00:00+03:00", race: {
        ...octoberRacePreviewData(week), phase: "active", quests: [], pathSelection: { path: null, selectedOn: null, canChoose: true },
      } };
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><div class="site-shell" data-theme="dark"><div style="height:76px"></div><div id="root"></div></div><script type="application/json" id="race-fixture">${JSON.stringify(fixture)}</script><script src="/live.js"></script>`);
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing local test address");
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
  try {
    for (const [width, height] of [[1900, 870], [393, 852]]) {
      for (const path of FINAL_RACE_PATHS) {
        const page = await browser.newPage({ viewport: { width, height } });
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`http://127.0.0.1:${address.port}`);
        await page.getByRole("button", { name: path.title, exact: true }).waitFor({ timeout: 5_000 }).catch(() => { throw new Error(`Live race did not render: ${errors.join("; ")}`); });
        await page.getByRole("button", { name: path.title, exact: true }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", { name: "Отмена", exact: true }).click();
        await page.getByRole("button", { name: path.title, exact: true }).click();
        await page.getByRole("dialog").getByRole("button", { name: "Выбрать путь", exact: true }).click();
        await page.getByRole("heading", { name: path.raceTitle, exact: true }).waitFor();
        expect(await page.locator(".compendium-star-race-quest.active h3").textContent()).toBe("Всеобщие любимчики");
        const names = await page.locator(".compendium-star-race-quest.active .compendium-hero strong").allTextContents();
        expect(names).toEqual(path.id === "core"
          ? ["Anti-Mage", "Axe", "Invoker", "Legion Commander", "Phantom Lancer", "Windranger"]
          : ["Crystal Maiden", "Dazzle", "Lich", "Lion", "Pudge", "Witch Doctor"]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: fileURLToPath(new URL(`${path.id}-${width}.png`, directory)), fullPage: true });
        await page.close();
      }
    }
    expect(posts).toEqual(Array(4).fill("/api/compendium/star-race/path"));
  } finally {
    await browser.close();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}, 60_000);
