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
const model = source("../app/season/model/season-overview-model.ts");
const styles = source("../app/styles/64-season-overview.css");
const secondaryStyles = source(
  "../app/styles/65-season-secondary-overview.css",
);
const routeStyles = source("../app/styles/season-route.css");

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
  });

  it("shows the invitation-only cup and the named Fast Cup events", () => {
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
    expect(model.match(/prize: "2 000 ₽"/g)).toHaveLength(5);
    expect(fastCupSection).toContain("fastCupOverviews.map");
  });

  it("keeps the desktop overview within the viewport and isolates its styles", () => {
    expect(page).toContain("hasFooter={false}");
    expect(styles).toMatch(
      /\.season-overview\s*\{[^}]*height:\s*calc\(100svh - 106px\);[^}]*overflow:\s*hidden;/,
    );
    expect(styles).toMatch(
      /@media \(max-width:\s*1050px\)[\s\S]*\.season-overview\s*\{[^}]*height:\s*auto;[^}]*overflow:\s*visible;/,
    );
    expect(routeStyles).toContain("64-season-overview.css");
    expect(secondaryStyles).toContain(".fast-cups-grid");
    const layout = source("../app/season/layout.tsx");
    expect(layout).toContain("season-route.css");
    expect(layout).toContain("65-season-secondary-overview.css");
  });
});
