import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const hero = source(
  "../app/tournaments/[slug]/sections/TournamentHero.tsx",
);
const hook = source(
  "../app/tournaments/[slug]/hooks/useTournamentHeroVisibility.ts",
);
const route = source("../app/api/tournament-hero-preferences/route.ts");
const tournamentRoute = source("../app/api/tournament/route.ts");
const styles = source("../app/styles/03-tournament-hero-collapse.css");
const migration = source(
  "../../bot/database/migrations/0129_tournament_hero_preferences.sql",
);

describe("tournament hero collapse", () => {
  it("keeps the hero open by default and stores a separate account preference", () => {
    expect(migration).toContain(
      "PRIMARY KEY (tournament_id, player_id)",
    );
    expect(migration).toContain("is_collapsed BOOLEAN NOT NULL DEFAULT FALSE");
    expect(tournamentRoute).toContain("loadTournamentHeroPreference(");
    expect(route).toContain("requireSession()");
    expect(hook).toContain('fetchSiteRequest(');
    expect(hook).toContain('"/api/tournament-hero-preferences"');
  });

  it("places an accessible toggle directly below the hero's right edge", () => {
    expect(hero).toContain('className="tournament-hero-toggle"');
    expect(hero).toContain("aria-expanded={!isCollapsed}");
    expect(hero).toContain("FiChevronUp");
    expect(hero).toContain("FiChevronDown");
    expect(styles).toMatch(
      /\.tournament-hero-toggle\s*\{[^}]*top:\s*100%;[^}]*right:\s*0;/,
    );
  });

  it("folds the whole poster and stage strip upward with reduced-motion support", () => {
    expect(hero).toContain('id="tournament-hero-content"');
    expect(hero).toContain("is-collapsed");
    expect(styles).toContain("grid-template-rows: 0fr");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
