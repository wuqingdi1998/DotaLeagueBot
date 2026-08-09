import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../bot/database/migrations/0064_seasonal_cups.sql",
    import.meta.url,
  ),
  "utf8",
);

function valuesBlock(table: string) {
  const match = migration.match(
    new RegExp(`INSERT INTO ${table} VALUES([\\s\\S]*?);`),
  );
  expect(match, `Не найден блок ${table}`).not.toBeNull();
  return match?.[1] ?? "";
}

function rowCount(block: string) {
  return (block.match(/^\s*\('league-cup-season-/gm) ?? []).length;
}

describe("historical seasonal cups", () => {
  it("adds all four cups as archived seasonal team tournaments", () => {
    for (const season of [5, 6, 7, 8]) {
      expect(migration).toContain(`'league-cup-season-${season}'`);
    }
    expect(migration).toContain("'seasonal_cup'");
    expect(migration).toContain("'archived'");
    expect(rowCount(valuesBlock("seasonal_cup_tournaments"))).toBe(4);
    expect(rowCount(valuesBlock("seasonal_cup_teams"))).toBe(16);
  });

  it("preserves every roster, including twelve coaches", () => {
    const rosters = valuesBlock("seasonal_cup_rosters");
    expect(rowCount(rosters)).toBe(92);
    expect(rosters.match(/, 'coach',/g)).toHaveLength(12);
    expect(migration).toContain("Архивная запись сезонного кубка");
    expect(migration).toContain("player_identity_members");
  });

  it("imports every group and playoff match with the corrected November date", () => {
    expect(rowCount(valuesBlock("seasonal_cup_matches"))).toBe(41);
    expect(migration).toContain("'2024-11-03 19:30:00+03'");
    expect(migration).toContain("winner_to_match_id");
    expect(migration).toContain("tournament_team_results");
  });

  it("awards Season 8 hall-of-fame medals only to players", () => {
    expect(migration).toContain("INSERT INTO player_medals");
    expect(migration).toContain("roster.role <> 'coach'");
    expect(migration).toContain("'gold'::text");
    expect(migration).toContain("'silver'::text");
    expect(migration).toContain("'bronze'::text");
  });
});
