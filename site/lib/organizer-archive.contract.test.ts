import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const header = source("../app/components/SiteHeader.tsx");
const platformShell = source("../app/tournaments/TournamentsHub.tsx");
const tournamentFooter = source(
  "../app/tournaments/[slug]/sections/CommunityFooter.tsx",
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

  it("shows the two requested archived pages", () => {
    expect(organizerArchive).toContain('title: "Компендиум"');
    expect(organizerArchive).toContain('href: "/organizer/compendium"');
    expect(organizerArchive).toContain(
      'title: "Результаты компендиума"',
    );
    expect(organizerArchive).toContain(
      'href: "/organizer/compendium/results"',
    );
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
