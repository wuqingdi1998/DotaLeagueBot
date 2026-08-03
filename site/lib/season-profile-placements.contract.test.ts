import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../bot/database/migrations/0041_season_8_rank_snapshots.sql",
    import.meta.url,
  ),
  "utf8",
);
const tournamentHistory = readFileSync(
  new URL("./player-tournament-history.ts", import.meta.url),
  "utf8",
);

describe("season profile placements", () => {
  it("stores every active Season 8 place, including chep at 33rd", () => {
    expect(migration.match(/^\s+\(\d+, /gm)).toHaveLength(47);
    expect(migration).toContain("(33, 'chep')");
    expect(migration).toContain("rank_snapshot = source.rank_snapshot");
    expect(migration).toContain("participant.standings_section = 'active'");
  });

  it("guards every completed Season archive against missing active places", () => {
    expect(migration).toContain("tournament.tournament_type = 'seasonal'");
    expect(migration).toContain("tournament.status IN ('finished', 'archived')");
    expect(migration).toContain("participant.rank_snapshot IS NULL");
  });

  it("never presents an inactive-list rank as a place in the main standings", () => {
    expect(tournamentHistory).toContain("participant.standings_section");
    expect(tournamentHistory).toContain(
      'row.standings_section === "inactive"',
    );
    expect(tournamentHistory).toContain('return "Вне общей таблицы"');
  });
});
