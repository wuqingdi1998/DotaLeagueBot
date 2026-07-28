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
const finalMedalsMigration = readFileSync(
  new URL(
    "../../bot/database/migrations/0021_final_medals_from_results.sql",
    import.meta.url,
  ),
  "utf8",
);
const season8Migration = readFileSync(
  new URL(
    "../../bot/database/migrations/0022_league_season_8.sql",
    import.meta.url,
  ),
  "utf8",
);

function migrationJson<T>(name: string): T {
  const match = season8Migration.match(
    new RegExp(`\\$${name}\\$([\\s\\S]*?)\\$${name}\\$::jsonb`),
  );
  if (!match) throw new Error(`Missing ${name} data in season 8 migration`);
  return JSON.parse(match[1]) as T;
}

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

  it("makes the final result the only medal source", () => {
    expect(finalMedalsMigration).toMatch(/SET medal = NULL/);
    expect(finalMedalsMigration).toContain(
      "season_finalists_seed_unique_idx",
    );
  });
});

describe("season 8 import migration", () => {
  it("contains every standings player and regular match from Excel", () => {
    const players = migrationJson<Array<{ nickname: string }>>("players");
    const matches = migrationJson<
      Array<{ ap: string[]; bp: string[] }>
    >("matches");

    expect(players).toHaveLength(65);
    expect(new Set(players.map((player) => player.nickname)).size).toBe(65);
    expect(matches).toHaveLength(34);
    expect(matches.every((match) => match.ap.length === 5)).toBe(true);
    expect(matches.every((match) => match.bp.length === 5)).toBe(true);
    const playerNames = new Set(
      players.map((player) => player.nickname.trim().toLocaleLowerCase("ru")),
    );
    expect(
      matches
        .flatMap((match) => [...match.ap, ...match.bp])
        .filter(
          (nickname) =>
            !playerNames.has(nickname.trim().toLocaleLowerCase("ru")),
        ),
    ).toEqual([]);
  });

  it("contains all penalties, finalists and both final matches", () => {
    expect(migrationJson<unknown[]>("penalties")).toHaveLength(32);
    expect(migrationJson<unknown[]>("finalists")).toHaveLength(20);
    expect(migrationJson<unknown[]>("final_matches")).toHaveLength(2);
  });

  it("stops safely when an Excel nickname cannot be linked", () => {
    expect(season8Migration).toContain("IF missing_players IS NOT NULL");
    expect(season8Migration).toMatch(/RAISE EXCEPTION[\s\S]+missing_players/);
  });

  it("keeps historical nicknames when a linked profile is renamed", () => {
    expect(season8Migration).toMatch(
      /ALTER TABLE season_participants[\s\S]+nickname_snapshot/,
    );
    expect(season8Migration).toMatch(
      /ALTER TABLE season_match_participants[\s\S]+nickname_snapshot/,
    );
  });
});
