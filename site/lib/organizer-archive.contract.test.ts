import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { COMPENDIUM_ARCHIVES } from "@/app/compendium/model/archive";
import { OrganizerArchive } from "@/app/organizer/sections/OrganizerArchive";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const header = source("../app/components/SiteHeader.tsx");
const platformShell = source("../app/tournaments/TournamentsHub.tsx");
const tournamentFooter = source(
  "../app/tournaments/[slug]/sections/TournamentFooter.tsx",
);
const organizerLink = source("../app/tournaments/OrganizerArchiveLink.tsx");
const organizerArchive = source(
  "../app/organizer/sections/OrganizerArchive.tsx",
);
const organizerLayout = source("../app/organizer/layout.tsx");
const organizerRouteStyles = source("../app/styles/organizer-route.css");
const organizerStyles = source("../app/styles/64-organizer-archive.css");

describe("organizer archive navigation", () => {
  it("moves the organizer entry from the header to both site footers", () => {
    expect(header).not.toContain("organizer-menu-button");
    expect(header).not.toContain('href="/organizer"');
    expect(platformShell).toContain("<OrganizerArchiveLink");
    expect(tournamentFooter).toContain("<OrganizerArchiveLink");
    expect(organizerLink).toContain("if (!isOrganizer) return null");
    expect(organizerLink).toContain("Архив организатора");
  });

  it("removes compendium results from desktop and mobile header navigation", () => {
    expect(header).not.toContain('href="/compendium/results"');
    expect(header).not.toContain("Результаты<br />компендиума");
  });

  it("replaces direct base and test profile buttons with the cup constructor and retains the archived test", () => {
    expect(header).not.toContain('href="/compendium/base"');
    expect(header).not.toContain('href="/compendium/test"');
    expect(header).toContain("user.isAdmin && <Link");
    expect(header).toContain("Конструктор кубка");
    expect(organizerArchive).toContain('href="/compendium/test"');
    expect(source("../app/organizer/compendium-october/components/OctoberPreviewProfileActions.tsx")).not.toContain('href="/compendium/test"');
  });

  it("separates each numbered compendium into page, results and participant base links", () => {
    const html = renderToStaticMarkup(createElement(OrganizerArchive));
    expect(organizerArchive).toContain("COMPENDIUM_ARCHIVES");
    expect(Object.values(COMPENDIUM_ARCHIVES).map((archive) => archive.number)).toEqual([1, 2]);
    const destinations = Object.values(COMPENDIUM_ARCHIVES).flatMap((archive) => [archive.pageHref, archive.resultsHref, archive.baseHref]);
    expect(new Set(destinations).size).toBe(6);
    for (const href of destinations) expect(html).toContain(`href="${href}"`);
    for (const number of [1, 2]) {
      for (const title of ["Страница", "Результаты", "База участников"]) {
        expect(html).toContain(`${title} компендиума №${number}`);
      }
    }
    expect(html).not.toContain("Будущий апдейт");
    expect(html).not.toContain("Новый компендиум");
  });

  it("loads organizer styles only on organizer routes and adapts to phones", () => {
    expect(organizerLayout).toContain('import "../styles/organizer-route.css"');
    expect(organizerRouteStyles).toContain('@import "./compendium-route.css"');
    expect(organizerRouteStyles).toContain(
      '@import "./64-organizer-archive.css"',
    );
    expect(organizerStyles).toMatch(
      /@media \(max-width:\s*760px\)[\s\S]*\.organizer-archive-menu\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/,
    );
  });
});
