import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../bot/database/migrations/0019_seasonal_tournaments.sql",
    import.meta.url,
  ),
  "utf8",
);
const disciplineMigration = readFileSync(
  new URL(
    "../../bot/database/migrations/0020_season_discipline_and_finals.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("season database migration", () => {
  it("keeps existing tournaments ordinary by default", () => {
    expect(migration).toMatch(
      /tournament_type[^;]+DEFAULT 'ordinary'[^;]+ordinary[^;]+seasonal/i,
    );
  });

  it("creates uniquely numbered rounds that are hidden by default", () => {
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS season_rounds/i);
    expect(migration).toMatch(/is_visible BOOLEAN NOT NULL DEFAULT FALSE/i);
    expect(migration).toMatch(/UNIQUE \(tournament_id, round_number\)/i);
  });

  it("keeps Dota match identifiers outside JavaScript number precision", () => {
    expect(migration).toMatch(/dota_match_id VARCHAR\(32\)/i);
  });

  it("prevents duplicate players inside one seasonal match", () => {
    expect(migration).toMatch(/UNIQUE \(match_id, player_id\)/i);
  });

  it("rejects a winner that contradicts the stored score", () => {
    expect(migration).toMatch(
      /result = 'team_a' AND team_a_score > team_b_score/i,
    );
    expect(migration).toMatch(
      /result = 'team_b' AND team_b_score > team_a_score/i,
    );
  });
});

describe("season discipline database migration", () => {
  it("adds manual p adjustments, penalties and map substitutions", () => {
    expect(disciplineMigration).toContain("season_point_adjustments");
    expect(disciplineMigration).toContain("season_penalty_events");
    expect(disciplineMigration).toContain("season_match_substitutions");
    expect(disciplineMigration).toContain(
      "season_match_substitutions_match_level_idx",
    );
  });

  it("creates one hidden finals round per seasonal tournament", () => {
    expect(disciplineMigration).toMatch(
      /WHERE round_kind = 'finals'/,
    );
    expect(disciplineMigration).toMatch(
      /'Финалы', 'finals', FALSE/,
    );
  });

  it("stores active and inactive standings sections", () => {
    expect(disciplineMigration).toMatch(
      /standings_section[^;]+active[^;]+inactive/,
    );
  });
});
