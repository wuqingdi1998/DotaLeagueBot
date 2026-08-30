import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const globals = source("../app/globals.css");
const headerResponsive = source(
  "../app/styles/02-site-header-responsive.css",
);
const compendium = source("../app/styles/compendium-route.css");
const tournaments = source("../app/styles/tournaments-route.css");
const draft = source("../app/styles/fearless-draft-route.css");
const calendar = source("../app/styles/calendar-route.css");

describe("route-specific styles", () => {
  it("keeps only shared interface styles in the root bundle", () => {
    expect(globals).toContain("01-foundation.css");
    expect(globals).toContain("52-site-break.css");
    expect(globals).not.toContain("33-compendium.css");
    expect(globals).not.toContain("50-fearless-draft.css");
    expect(globals).not.toContain("62-season-calendar.css");
  });

  it("loads each large section from its own layout", () => {
    expect(compendium).toContain("33-compendium.css");
    expect(tournaments).toContain("03-tournament-hero.css");
    expect(draft).toContain("50-fearless-draft.css");
    expect(calendar).toContain("62-season-calendar.css");
    expect(source("../app/compendium/layout.tsx")).toContain(
      "compendium-route.css",
    );
    expect(source("../app/calendar/layout.tsx")).toContain(
      "calendar-route.css",
    );
  });

  it("loads mobile tournament rules after the desktop tournament modules", () => {
    expect(globals).toContain("02-site-header-responsive.css");
    expect(globals).not.toContain("08-tournament-responsive.css");
    expect(headerResponsive).toContain("@media (max-width: 760px)");
    expect(tournaments).toContain("08-tournament-responsive.css");
    expect(tournaments.indexOf("08-tournament-responsive.css")).toBeGreaterThan(
      tournaments.indexOf("03-tournament-hero.css"),
    );
  });
});
