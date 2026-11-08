import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { cupTournament } from "@/tests/cup-schedule-context";
import { ArchiveRosterEditor } from "../ArchiveRosterEditor";
import { TeamsPanel } from "./TeamsPanel";
import { ApplicationsAdmin } from "../admin/ApplicationsAdmin";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { dirname, resolve } from "node:path";

const context = vi.hoisted(() => ({
  activeTab: "teams", approvedTeams: [], registrationAvailable: false,
  checkInWindow: null,
  data: {
    tournament: { ...{} as typeof cupTournament },
    applications: [{
      id: 1, team_name: "Команда", tag: "TEAM", status: "approved",
      selection_method: "", team_tier_total_snapshot: null as number | null,
      members: [{ name: "Игрок", role: "safe_lane", is_captain: true, tier_snapshot: 8 }],
    }],
  },
}));
vi.mock("../hooks/TournamentContext", () => ({ useTournament: () => context }));

beforeEach(() => {
  context.data.tournament = { ...cupTournament, show_tiers: true };
  context.data.applications[0].selection_method = "";
  context.data.applications[0].team_tier_total_snapshot = null;
});

it("labels the current cup leader as manager and keeps earlier cup captains", () => {
  expect(renderToStaticMarkup(<TeamsPanel />)).toContain("менеджер");
  expect(renderToStaticMarkup(<ApplicationsAdmin />)).toContain("Менеджер:");
  context.data.tournament.start_at = "2025-11-01T00:00:00+03:00";
  expect(renderToStaticMarkup(<TeamsPanel />)).toContain("капитан");
  expect(renderToStaticMarkup(<ApplicationsAdmin />)).toContain("Капитан:");
});

it.each(["", "   "])("omits empty participation details (%j) while keeping player tiers", (method) => {
  context.data.applications[0].selection_method = method;
  const html = renderToStaticMarkup(<TeamsPanel />);
  expect(html).not.toContain("team-archive-meta");
  expect(html).not.toContain("Тир команды:");
  expect(html).toContain("тир 8");
});

it("shows each optional detail independently, including a zero team total", () => {
  context.data.applications[0].selection_method = "Приглашение";
  let html = renderToStaticMarkup(<TeamsPanel />);
  expect(html).toContain("Приглашение");
  expect(html).not.toContain("Тир команды:");
  context.data.applications[0].selection_method = "";
  context.data.applications[0].team_tier_total_snapshot = 0;
  html = renderToStaticMarkup(<TeamsPanel />);
  expect(html).toContain("Тир команды: 0");
  expect(html).not.toContain("<span></span>");
  context.data.tournament.show_tiers = false;
  expect(renderToStaticMarkup(<TeamsPanel />)).not.toContain("team-archive-meta");
});

it("applies the two-column layout only to league cups", () => {
  expect(renderToStaticMarkup(<TeamsPanel />)).toContain("teams-grid-league-cup");
  expect(renderToStaticMarkup(<TeamsPanel />)).not.toContain("Допущена");
  context.data.tournament.tournament_type = "ordinary";
  const ordinaryHtml = renderToStaticMarkup(<TeamsPanel />);
  expect(ordinaryHtml).not.toContain("teams-grid-league-cup");
  expect(ordinaryHtml).toContain("Допущена");
});

it("places the team name and smaller parenthesized tag together beside the avatar", () => {
  const html = renderToStaticMarkup(<TeamsPanel />);
  expect(html).toContain('<div class="team-card-heading"><h3><span class="team-card-name">Команда</span> <small class="team-tag">(TEAM)</small></h3>');
  expect(html).not.toContain('<p class="team-tag">');
});

it.each(["ordinary", "seasonal"] as const)("keeps the original team presentation outside league cups: %s", (type) => {
  context.data.tournament.tournament_type = type;
  const html = renderToStaticMarkup(<TeamsPanel />);
  expect(html).not.toContain("team-card-league-cup");
  expect(html).toContain('<p class="team-tag">TEAM</p><h3>Команда</h3>');
  expect(html).not.toContain('(TEAM)');
});

it("keeps cup and ordinary team layouts separate on desktop and phones", async () => {
  function loadStyles(file: string): string {
    return readFileSync(file, "utf8").replace(/@import\s+["'](.+?)["'];/g,
      (_, path: string) => path.endsWith(".css") ? loadStyles(resolve(dirname(file), path)) : "");
  }
  const css = loadStyles("app/globals.css") + loadStyles("app/styles/tournaments-route.css");
  const browser = await chromium.launch();
  mkdirSync(".data/team-layout", { recursive: true });
  try {
    for (const width of [1366, 393, 360]) {
      for (const type of ["ordinary", "seasonal_cup"] as const) {
        context.data.tournament.tournament_type = type;
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.route("https://team-layout.test/fonts/**", (route) => route.fulfill({
          body: readFileSync(`public${new URL(route.request().url()).pathname}`),
        }));
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.setContent(`<html data-theme="dark"><base href="https://team-layout.test"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style>${renderToStaticMarkup(<TeamsPanel />)}</html>`);
        await page.evaluate(() => document.fonts.ready);
        await page.locator(".team-card").evaluate((node) => node.getAnimations().forEach((animation) => animation.finish()));
        const size = await page.locator(".team-avatar").boundingBox();
        expect(size!.width).toBeCloseTo(type === "ordinary" ? 60 : 120, 1);
        expect(size!.height).toBeCloseTo(type === "ordinary" ? 60 : 120, 1);
        const heading = page.locator(".team-card h3");
        expect(await heading.evaluate((node) => getComputedStyle(node).fontSize))
          .toBe(`${type === "ordinary" ? 27 : width > 760 ? 36 : width > 380 ? 32 : 28}px`);
        const tag = page.locator(".team-tag");
        expect(await tag.textContent()).toBe(type === "ordinary" ? "TEAM" : "(TEAM)");
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${type} at ${width}px`).toBeLessThanOrEqual(width);
        await page.screenshot({ path: `.data/team-layout/${type}-${width}.png`, fullPage: true });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}, 30000);

it.each([false, true])("allows empty editable participation details in the roster form, historical: %s", (isHistorical) => {
  const html = renderToStaticMarkup(<ArchiveRosterEditor
    tournamentId={52} isHistorical={isHistorical} onSaved={async () => {}} onMessage={() => {}} />);
  expect(html).toMatch(/Метод участия \(необязательно\)<\/span><input maxLength="80" value=""/);
  expect(html).toMatch(/Суммарный тир команды \(необязательно\)<\/span><input type="number" min="0" max="100" value=""/);
  expect(html).not.toContain("Регистрация");
});
