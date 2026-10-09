import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), one: vi.fn() }));
vi.mock("@/lib/db", () => mocks);
vi.mock("./leaderboard-repository", () => ({ loadCompendiumLeaderboard: vi.fn().mockResolvedValue([]) }));
vi.mock("./star-race-repository", () => ({ loadStarRaceLeaderboard: vi.fn().mockResolvedValue([]) }));
import { loadCompendiumResults } from "./results-repository";
import { loadClaimedChallengeKeys, loadUnclaimedChallengeCandidates } from "./unclaimed-challenges-repository";

const db = new PGlite();
beforeAll(async () => {
  await db.exec(readFileSync(new URL("../../../tests/fixtures/october-compendium.sql", import.meta.url), "utf8"));
  await db.exec("ALTER TABLE compendium_admin_star_adjustments ADD COLUMN season_match_id bigint;");
  await db.exec(`ALTER TABLE october_compendium_clan_members ADD COLUMN clan_id text DEFAULT 'morbus';
    CREATE TABLE player_discord_roles (player_id bigint, role_name text);
    INSERT INTO player_discord_roles VALUES (100, 'Суппортеры');
    CREATE TABLE october_compendium_rune_challenge_selections (player_id bigint, hero_id smallint, selected_at timestamptz);
    INSERT INTO october_compendium_rune_challenge_selections VALUES
      (100, 1, '2026-10-09 11:00+03'), (200, 2, '2026-10-09 11:00+03');`);
  for (const migration of ["0170_isolate_october_compendium.sql", "0174_compendium_review_repairs.sql"]) {
    const sql = readFileSync(new URL(`../../../../bot/database/migrations/${migration}`, import.meta.url), "utf8");
    // PostgreSQL's clock is fixed only inside this test database, including in CI after October.
    await db.exec(sql.replaceAll("CURRENT_TIMESTAMP", "TIMESTAMPTZ '2026-10-09 12:00:00+03'"));
  }
  await db.exec(`CREATE VIEW compendium_player_star_totals AS
    SELECT player.discord_id AS player_id, GREATEST(0, COALESCE(SUM(event.amount), 0))::int AS total_stars
    FROM players player LEFT JOIN compendium_star_events event ON event.player_id = player.discord_id GROUP BY player.discord_id;`);
  mocks.query.mockImplementation(async (sql: string, values: unknown[] = []) =>
    (await db.query(sql, values)).rows.map((row) => {
      const record = row as Record<string, unknown>;
      return record.selected_at ? { ...record, selected_at: new Date(String(record.selected_at)) } : record;
    }));
  mocks.one.mockImplementation(async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows[0] ?? null);
}, 20000);
afterAll(async () => db.close());

it("counts clan outings in all three weekly races", async () => {
  await db.exec(`INSERT INTO october_compendium_clan_outing_completions VALUES
    (900, 100, 1, '2026-10-12 12:00+03', '2026-10-12', 900, 200),
    (901, 100, 1, '2026-10-19 12:00+03', '2026-10-19', 901, 200);`);
  expect((await db.query("SELECT SUM(amount)::int AS stars FROM compendium_star_race_events WHERE player_id = 100 AND earned_at >= '2026-10-12'")).rows)
    .toEqual([{ stars: 2 }]);
});
it("separates archived results and October results, with an exact category sum", async () => {
  const data = await loadCompendiumResults("100", "october", new Date("2026-10-09T12:00:00+03:00"));
  expect(data.personal).toEqual({ totalStars: 11, dailyQuestStars: 6, starRaceStars: 2,
    predictionStars: 1, tournamentParticipationStars: 0, otherStars: 2 });
  expect(data.races.map((race) => race.id)).toEqual(["2026-10-05", "2026-10-12", "2026-10-19"]);
  expect(data.isFinished).toBe(false);
  const archive = await loadCompendiumResults("100", "ti-2026");
  expect(archive.personal?.totalStars).toBe(150);
  expect(archive.personal?.dailyQuestStars).toBe(97);
  expect(archive.personal?.otherStars).toBe(3);
  expect(archive.races.map((race) => race.id)).toEqual(["2026-08-10", "2026-08-17"]);
});
it("sees a rune reward claimed during an October reminder scan", async () => {
  const keys = await loadClaimedChallengeKeys({ dateKey: "2026-10-06", dailyQuestIds: [],
    starRacePlayerIds: [], runePlayerIds: ["100"], clanOutingPlayerIds: [] });
  expect(keys.has("rune:100:2026-10-06")).toBe(true);
});
it("uses the current rune selection time and excludes players without rune access", async () => {
  const candidates = await loadUnclaimedChallengeCandidates("2026-10-09", false);
  expect(candidates.find((player) => player.playerId === "100"))
    .toMatchObject({ runeHeroId: 1, runeSelectedAt: "2026-10-09T08:00:00.000Z" });
  expect(candidates.find((player) => player.playerId === "200")?.runeHeroId).toBeNull();
});
it("allows a current manual adjustment but protects old records and inactive participants", async () => {
  await db.exec(`INSERT INTO compendium_admin_star_adjustments
    (id, player_id, amount, created_at, administrator_name, is_star_race_eligible, reason)
    VALUES (950, 100, 2, '2026-10-09 12:00+03', 'Admin', false, 'Correction');`);
  expect((await db.query("SELECT total_stars FROM compendium_player_star_totals WHERE player_id = 100")).rows)
    .toEqual([{ total_stars: 13 }]);
  expect((await db.query("SELECT * FROM compendium_star_race_events WHERE earned_at = '2026-10-09 12:00+03'")).rows).toHaveLength(0);
  await expect(db.exec("UPDATE compendium_admin_star_adjustments SET amount = 5 WHERE id = 1"))
    .rejects.toThrow("outside the active October period");
  await expect(db.exec(`INSERT INTO compendium_admin_star_adjustments (id, player_id, amount, created_at)
    VALUES (951, 300, 1, '2026-10-09 12:00+03')`)).rejects.toThrow("not an active October participant");
});
