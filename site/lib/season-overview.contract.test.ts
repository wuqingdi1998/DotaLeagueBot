import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const header = source("../app/components/SiteHeader.tsx");
const page = source("../app/season/page.tsx");
const section = source("../app/season/sections/SeasonOverviewPage.tsx");
const fastCupSection = source(
  "../app/season/sections/FastCupsOverview.tsx",
);
const fastCupCard = source("../app/season/components/FastCupCard.tsx");
const leagueCupCard = source(
  "../app/season/components/LeagueCupOverviewCard.tsx",
);
const model = source("../app/season/model/season-overview-model.ts");
const styles = source("../app/styles/64-season-overview.css");
const secondaryStyles = source(
  "../app/styles/65-season-secondary-overview.css",
);
const routeStyles = source("../app/styles/season-route.css");
const seasonRule = source("../../.codex/rules/07-season-page.md");

describe("season overview page", () => {
  it("adds the season page to desktop and mobile navigation", () => {
    expect(header.match(/href="\/season"/g)).toHaveLength(2);
    expect(header).toContain("seasonActive");
    const desktopNavigation = header.slice(
      header.indexOf('className="platform-navigation"'),
      header.indexOf('className="header-actions"'),
    );
    expect(desktopNavigation.indexOf('href="/tournaments"')).toBeLessThan(
      desktopNavigation.indexOf('href="/season"'),
    );
    expect(desktopNavigation.indexOf('href="/season"')).toBeLessThan(
      desktopNavigation.indexOf('href="/calendar"'),
    );
  });

  it("explains the league and links to the existing calendar", () => {
    expect(page).toContain("SeasonOverviewPage");
    expect(section).toContain("LeagueOverviewCard");
    expect(model).toContain("14 туров · 1 раз в неделю · BO2");
    expect(model).toContain("ТОП-20 → ФИНАЛ");
    expect(model).toContain('calendarHref: "/calendar"');
    expect(model).toContain(
      'tournamentHref: "/tournaments/league-season-9"',
    );
    expect(model).toContain("Регистрация проходит отдельно на каждый тур");
    expect(section).toContain("season-overview-title-row");
  });

  it("shows dated tournaments and spells Fastcup as one word", () => {
    expect(section).toContain("LeagueCupOverviewCard");
    expect(section).toContain("FastCupsOverview");
    expect(model).toContain("Только по приглашению администрации");
    expect(model).toContain("Открытой регистрации нет");
    expect(model).toContain('prize: "7 500 ₽"');
    expect(model).toContain("Linken’s Sphere CD Fastcup #7");
    expect(model).toContain("Linken’s Sphere SD Fastcup #2");
    expect(model).toContain("Linken’s Sphere Fastcup #14");
    expect(model).toContain("Linken’s Sphere CD Fastcup #8");
    expect(model).toContain("Linken’s Sphere Fastcup #15");
    expect(model).toContain('period: "6 сентября — 20 декабря 2026"');
    expect(model).toContain('period: "2 ноября — 13 декабря 2026"');
    expect(model).toContain('period: "12–13 сентября 2026"');
    expect(model).toContain('period: "5–6 декабря 2026"');
    expect(model.match(/period: "/g)).toHaveLength(7);
    expect(model.match(/prize: "2 000 ₽"/g)).toHaveLength(5);
    expect(model.match(/tournamentHref: null/g)).toHaveLength(6);
    expect(fastCupSection).toContain("fastCupOverviews.map");
    expect(fastCupSection).toContain(">Fastcup<");
    expect(fastCupCard).toContain("Турнир для Boosty подписчиков");
    expect(fastCupCard).toContain("Призовой фонд — {cup.prize}");
    expect(fastCupCard).toContain("fast-cup-period");
    expect(fastCupCard).toContain("is-disabled");
    expect(leagueCupCard).toContain("season-tournament-link is-disabled");
    expect(fastCupCard).not.toContain("PRE-MADE");
    expect(model).not.toContain(["Fast", "Cup"].join(" "));
  });

  it("uses balanced desktop grids and isolates its styles", () => {
    expect(page).toContain("hasFooter={false}");
    expect(styles).toMatch(
      /\.season-primary-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/,
    );
    expect(secondaryStyles).toMatch(
      /\.fast-cups-grid\s*\{[^}]*grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\);/,
    );
    expect(routeStyles).toContain("64-season-overview.css");
    expect(secondaryStyles).toContain(".fast-cups-grid");
    expect(secondaryStyles).toContain(
      "font-size: clamp(11px, 0.75vw, 12px);",
    );
    expect(styles).toMatch(
      /@media \(max-width: 1050px\)[\s\S]*\.season-overview\s*\{[^}]*min-height:\s*calc\(100svh - 74px\);/,
    );
    const layout = source("../app/season/layout.tsx");
    expect(layout).toContain("season-route.css");
    expect(layout).toContain("65-season-secondary-overview.css");
    expect(layout).not.toContain("66-season-overview-desktop.css");
    expect(seasonRule).toContain("Читабельность важнее");
    expect(seasonRule).toContain("не меньше 13 px");
  });
});
