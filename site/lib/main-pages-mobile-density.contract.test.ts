import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globals = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const mobileDensity = readFileSync(
  new URL("../app/styles/10-public-mobile-density.css", import.meta.url),
  "utf8",
);

describe("mobile density on main public pages", () => {
  it("loads one shared mobile module after the home and directory styles", () => {
    expect(globals).toContain('import "./styles/10-public-mobile-density.css"');
    expect(globals.indexOf("10-public-mobile-density.css")).toBeGreaterThan(
      globals.indexOf("11-tournament-directory.css"),
    );
  });

  it("uses one readable heading and copy scale across the main pages", () => {
    expect(mobileDensity).toMatch(/@media \(max-width: 760px\)/);
    expect(mobileDensity).toMatch(/--mobile-page-heading:\s*34px/);
    expect(mobileDensity).toMatch(/--mobile-page-copy:\s*15px/);
    expect(mobileDensity).toMatch(
      /\.platform-shell \.directory-hero h1,[\s\S]*\.platform-shell \.hall-hero h1,[\s\S]*\.platform-shell \.boosty-hero h1[\s\S]*font-size:\s*var\(--mobile-page-heading\)/,
    );
  });

  it("removes oversized mobile blocks without touching profile selectors", () => {
    expect(mobileDensity).toMatch(
      /\.platform-shell \.tournament-card\s*\{[^}]*min-height:\s*0;[^}]*padding:\s*var\(--mobile-card-padding\)/,
    );
    expect(mobileDensity).toMatch(
      /\.platform-shell \.hall-medal-table\s*\{[^}]*--hall-row-height:\s*56px/,
    );
    expect(mobileDensity).toMatch(
      /\.platform-shell \.participants-row\s*\{[^}]*min-height:\s*54px/,
    );
    expect(mobileDensity).not.toMatch(/player-profile|archive-player/);
  });

  it("keeps participant filters legible on compact phones", () => {
    expect(mobileDensity).toMatch(
      /@media \(max-width: 350px\)[\s\S]*\.platform-shell \.participant-toolbar\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,
    );
    expect(mobileDensity).toMatch(
      /\.platform-shell \.participant-toolbar > label:nth-of-type\(4\)\s*\{[^}]*grid-column:\s*1 \/ -1/,
    );
  });

  it("keeps the season text at the required minimum size", () => {
    expect(mobileDensity).toMatch(
      /\.platform-shell \.season-overview\s*\{[^}]*font-size:\s*13px/,
    );
    expect(mobileDensity).not.toMatch(/font-size:\s*(?:[0-9]|1[0-2])px/);
  });
});
