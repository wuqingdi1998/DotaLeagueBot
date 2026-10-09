import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), one: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/db", () => mocks);
import { loadHistoricalChallenges } from "./challenge-history-repository";
import { completeHistoricalChallenge } from "./historical-completion-service";

const db = new PGlite();
const now = new Date("2026-10-12T10:00:00+03:00");
const source = (name: string) => readFileSync(new URL(`../../../../bot/database/migrations/${name}`, import.meta.url), "utf8");
beforeAll(async () => {
  await db.exec(readFileSync(new URL("../../../tests/fixtures/october-compendium.sql", import.meta.url), "utf8"));
  await db.exec(`
    ALTER TABLE october_compendium_clan_members ADD COLUMN clan_id text DEFAULT 'morbus';
    ALTER TABLE october_compendium_clan_members ADD COLUMN assigned_at timestamptz DEFAULT '2026-10-05 00:00+03';
    CREATE TABLE october_compendium_rune_challenge_selections (player_id bigint PRIMARY KEY REFERENCES players(discord_id) ON DELETE CASCADE, hero_id smallint, selected_at timestamptz);
    INSERT INTO october_compendium_rune_challenge_selections VALUES (100, 1, '2026-10-09 10:00+03');
    ALTER TABLE compendium_user_quest_completions ADD COLUMN completion_source text DEFAULT 'automatic';
    ALTER TABLE compendium_user_quest_completions ADD CONSTRAINT compendium_user_quest_completion_source_check CHECK (true);
    DELETE FROM compendium_user_quest_completions WHERE id = 4;
    CREATE UNIQUE INDEX daily_once ON compendium_user_quest_completions(player_id,daily_quest_id);
    CREATE UNIQUE INDEX race_once ON compendium_star_race_quest_completions(player_id,moscow_date);
    CREATE UNIQUE INDEX rune_once ON october_compendium_rune_challenge_completions(player_id,moscow_date);
    CREATE UNIQUE INDEX rune_match_once ON october_compendium_rune_challenge_completions(player_id,matched_match_id);
    CREATE UNIQUE INDEX outing_once ON october_compendium_clan_outing_completions(player_id,moscow_date);
    CREATE SEQUENCE manual_fixture_ids START 1000;
    ALTER TABLE compendium_user_quest_completions ALTER COLUMN id SET DEFAULT nextval('manual_fixture_ids');
    ALTER TABLE compendium_star_race_quest_completions ALTER COLUMN id SET DEFAULT nextval('manual_fixture_ids');
    ALTER TABLE october_compendium_rune_challenge_completions ALTER COLUMN id SET DEFAULT nextval('manual_fixture_ids');
    ALTER TABLE october_compendium_clan_outing_completions ALTER COLUMN id SET DEFAULT nextval('manual_fixture_ids');
    INSERT INTO compendium_daily_quest_sets VALUES (10, '2026-10-10');
    INSERT INTO compendium_daily_quests VALUES (10,10,1,100),(11,10,2,100);
    INSERT INTO compendium_daily_quest_heroes VALUES (10,7,1),(11,2,1);
  `);
  await db.exec(source("0170_isolate_october_compendium.sql"));
  await db.exec(source("0178_october_challenge_history.sql"));
  await db.exec(source("0168_october_rune_challenge.sql").slice(source("0168_october_rune_challenge.sql").indexOf("CREATE OR REPLACE FUNCTION apply_october_rune_clan_points()")));
  await db.exec(source("0175_protect_star_race_evidence_clan_points.sql"));
  await db.exec(`CREATE TRIGGER october_star_race_clan_points AFTER INSERT OR UPDATE OR DELETE
    ON compendium_star_race_quest_completions FOR EACH ROW EXECUTE FUNCTION apply_october_star_race_clan_points();
    CREATE VIEW compendium_player_star_totals AS SELECT player.discord_id AS player_id,
      GREATEST(0,COALESCE(SUM(event.amount),0))::int AS total_stars FROM players player
      LEFT JOIN compendium_star_events event ON event.player_id=player.discord_id GROUP BY player.discord_id;`);
  const rows = (result: { rows: unknown[] }) => result.rows.map((row) => Object.fromEntries(
    Object.entries(row as Record<string, unknown>).map(([key, value]) =>
      [key, key === "completed_at" && value ? new Date(String(value)) : value])));
  mocks.query.mockImplementation(async (sql: string, values: unknown[] = []) => rows(await db.query(sql, values)));
  mocks.one.mockImplementation(async (sql: string, values: unknown[] = []) => rows(await db.query(sql, values))[0] ?? null);
  mocks.transaction.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) => db.transaction(async (tx) => callback({
    query: async (sql: string, values: unknown[] = []) => {
      const result = await tx.query(sql, values);
      return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0 };
    },
  })));
}, 20000);
afterAll(async () => db.close());

it("keeps the actual past rune hero after the current selection changes", async () => {
  await db.exec("UPDATE october_compendium_rune_challenge_selections SET hero_id=2, selected_at='2026-10-16 10:00+03' WHERE player_id=100");
  const day = await loadHistoricalChallenges("100", "2026-10-10", now);
  expect(day.challenges).toHaveLength(5);
  expect(day.challenges.find((card) => card.kind === "rune")?.heroes[0].id).toBe(1);
  expect(day.challenges.filter((card) => card.kind !== "star_race").every((card) => card.rewardStars === 2)).toBe(true);
  expect(day.dates[0].dateKey).toBe("2026-10-12");
});

it("preserves an explicitly removed rune selection and allows deleting a player without a dangling history", async () => {
  await db.exec(`INSERT INTO players VALUES (999, 'Temporary', 999, NULL, false);
    INSERT INTO october_compendium_rune_challenge_selections VALUES (999, 7, '2026-10-09 12:00+03');
    DELETE FROM october_compendium_rune_challenge_selections WHERE player_id=999;`);
  expect((await db.query("SELECT hero_id FROM october_compendium_rune_selection_history WHERE player_id=999")).rows).toEqual([{ hero_id: 7 }]);
  await db.exec(`INSERT INTO october_compendium_rune_challenge_selections VALUES (999, 7, '2026-10-09 12:00+03');
    DELETE FROM players WHERE discord_id=999;`);
  expect((await db.query("SELECT * FROM october_compendium_rune_selection_history WHERE player_id=999")).rows).toEqual([]);
});

it("awards all five past tasks once and attributes stars to their original day", async () => {
  const totalsBefore = (await db.query<{ total_stars: number }>("SELECT total_stars FROM compendium_player_star_totals WHERE player_id=100")).rows[0].total_stars;
  const clanBefore = (await db.query<{ total_points: number }>("SELECT total_points FROM october_compendium_clan_members WHERE player_id=100")).rows[0].total_points;
  for (const target of [
    { kind: "daily" as const, questId: "10", heroId: 7, matchIds: ["900010"] },
    { kind: "daily" as const, questId: "11", heroId: 2, matchIds: ["900011"] },
    { kind: "clan_outing" as const, partnerPlayerId: "200", matchIds: ["900012"] },
    { kind: "rune" as const, matchIds: ["900013"] },
    { kind: "star_race" as const, matchIds: ["900014", "900015"] },
  ]) {
    const input = { ...target, playerId: "100", dateKey: "2026-10-10", administratorId: null, now };
    expect(await completeHistoricalChallenge(input)).toEqual({ rewardStars: 2, wasCreated: true });
    expect(await completeHistoricalChallenge(input)).toEqual({ rewardStars: 2, wasCreated: false });
  }
  expect((await db.query("SELECT total_stars FROM compendium_player_star_totals WHERE player_id=100")).rows)
    .toEqual([{ total_stars: totalsBefore + 10 }]);
  expect((await db.query("SELECT total_points FROM october_compendium_clan_members WHERE player_id=100")).rows)
    .toEqual([{ total_points: clanBefore + 10 }]);
  expect((await db.query("SELECT COUNT(*)::int AS count FROM october_compendium_manual_completion_audit")).rows).toEqual([{ count: 5 }]);
  expect((await db.query("SELECT SUM(amount)::int AS stars FROM compendium_star_events WHERE earned_at >= '2026-10-10 00:00+03' AND earned_at < '2026-10-11 00:00+03'")).rows)
    .toEqual([{ stars: 10 }]);
});

it("rejects future dates, the old compendium, a wrong hero and a different clan partner", async () => {
  for (const invalid of [
    { dateKey: "2026-10-13" }, { dateKey: "2026-08-20" }, { heroId: 99 },
  ]) await expect(completeHistoricalChallenge({ playerId: "100", dateKey: "2026-10-10", kind: "daily", questId: "10",
    heroId: 7, matchIds: ["900010"], administratorId: null, now, ...invalid })).rejects.toThrow();
  await expect(completeHistoricalChallenge({ playerId: "100", dateKey: "2026-10-10", kind: "clan_outing",
    partnerPlayerId: "300", matchIds: ["900010"], administratorId: null, now })).rejects.toThrow("Выберите участника");
});

it("allows a late organizer correction after the event and refreshes the original race standings", async () => {
  await db.exec(`INSERT INTO compendium_star_race_standings_snapshots VALUES ('2026-10-05 00:00+03', '[]');`);
  expect(await completeHistoricalChallenge({ playerId: "100", dateKey: "2026-10-09", kind: "star_race",
    matchIds: ["900016"], administratorId: null, now: new Date("2026-10-27T12:00:00+03:00") }))
    .toEqual({ rewardStars: 2, wasCreated: true });
  expect((await db.query("SELECT * FROM compendium_star_race_standings_snapshots")).rows).toEqual([]);
  expect((await db.query("SELECT completion_source FROM compendium_star_race_quest_completions WHERE player_id=100 AND moscow_date='2026-10-09'")).rows)
    .toEqual([{ completion_source: "manual" }]);
});
