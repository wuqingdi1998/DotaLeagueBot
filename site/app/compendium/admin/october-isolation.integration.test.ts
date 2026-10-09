import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), one: vi.fn(), ensureDailyQuestSet: vi.fn() }));
vi.mock("@/lib/db", () => ({ query: mocks.query, one: mocks.one }));
vi.mock("../services/repository", () => ({ ensureDailyQuestSet: mocks.ensureDailyQuestSet }));
vi.mock("../services/star-race-repository", () => ({ loadStarRaceLeaderboard: vi.fn().mockResolvedValue([]) }));
import { loadCompendiumAdminParticipantHistory, loadCompendiumAdminParticipants } from "./repository";
import { loadCompendiumStarRaceArchive } from "./star-race-archive-repository";

const db = new PGlite();

beforeAll(async () => {
  await db.exec(readFileSync(new URL("../../../tests/fixtures/october-compendium.sql", import.meta.url), "utf8"));
  await db.exec(readFileSync(new URL(
    "../../../../bot/database/migrations/0170_isolate_october_compendium.sql", import.meta.url,
  ), "utf8"));
  await db.exec(`CREATE VIEW compendium_player_star_totals AS
    SELECT player.discord_id AS player_id, GREATEST(0, COALESCE(SUM(event.amount), 0))::int AS total_stars
    FROM players player LEFT JOIN compendium_star_events event ON event.player_id = player.discord_id
    GROUP BY player.discord_id;`);
  mocks.query.mockImplementation(async (sql: string, values: unknown[] = []) => {
    const { rows } = await db.query(sql, values);
    // node-postgres returns timestamps as Date objects; PGlite returns strings.
    return rows.map((row) => Object.fromEntries(Object.entries(row as Record<string, unknown>)
      .map(([key, value]) => [key, key === "completed_at" && value ? new Date(String(value)) : value])));
  });
  mocks.one.mockResolvedValue(null);
}, 20000);

afterAll(async () => { vi.useRealTimers(); await db.close(); });

it("keeps only nine October stars and includes the missing Slark rune in history", async () => {
  const rewards = await loadCompendiumAdminParticipantHistory("100");
  expect(rewards).toHaveLength(6);
  expect(rewards?.reduce((sum, reward) => sum + reward.rewardAmount, 0)).toBe(9);
  expect(rewards?.every((reward) => reward.dateKey.startsWith("2026-10-"))).toBe(true);
  expect(rewards).toContainEqual(expect.objectContaining({
    kind: "rune", rewardAmount: 1, hero: expect.objectContaining({ id: 93 }), matchedMatchId: "9032115369",
  }));
  expect((await db.query("SELECT total_stars FROM compendium_player_star_totals WHERE player_id = 100")).rows)
    .toEqual([{ total_stars: 9 }]);
  expect((await db.query("SELECT SUM(amount)::int AS stars FROM compendium_star_race_events WHERE player_id = 100")).rows)
    .toEqual([{ stars: 5 }]);
});

it("returns empty history for an existing player with awards only in the archive", async () => {
  expect(await loadCompendiumAdminParticipantHistory("200")).toEqual([]);
  expect(await loadCompendiumAdminParticipantHistory("999")).toBeNull();
  expect((await db.query("SELECT total_stars FROM compendium_player_star_totals WHERE player_id IN (200, 300)")).rows)
    .toEqual([{ total_stars: 0 }, { total_stars: 0 }]);
});

it("shows the October current challenge and counts the same history operations", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-07T12:00:00+03:00"));
  const participants = await loadCompendiumAdminParticipants();
  expect(participants.find((player) => player.discordId === "100")).toMatchObject({
    totalStars: 9, rewardCount: 6,
    currentStarRaceQuests: [expect.objectContaining({ dateKey: "2026-10-07", title: "Передовая" })],
  });
  expect(participants.find((player) => player.discordId === "200")?.rewardCount).toBe(0);
  vi.useRealTimers();
});

it("loads all three October scenarios without the August races or their standings", async () => {
  const races = await loadCompendiumStarRaceArchive(new Date("2026-10-07T12:00:00+03:00"));
  expect(races.map((race) => race.id)).toEqual(["2026-10-19", "2026-10-12", "2026-10-05"]);
  expect(races.flatMap((race) => race.quests)).toHaveLength(21);
  expect(mocks.one).not.toHaveBeenCalled();
});

it("removes previous stars from saved activity without changing current clan points", async () => {
  expect((await db.query("SELECT total_points, activity_score::float AS score FROM october_compendium_clan_members WHERE player_id = 100")).rows)
    .toEqual([{ total_points: 9, score: 32 }]);
  expect((await db.query(`SELECT column_name FROM information_schema.columns
    WHERE table_name = 'october_compendium_clan_activity' AND column_name = 'previous_compendium_stars'`)).rows)
    .toEqual([]);
});

it("saves finished October weeks using the new compendium's end date", async () => {
  const races = await loadCompendiumStarRaceArchive(new Date("2026-10-14T12:00:00+03:00"));
  expect(races.find((race) => race.id === "2026-10-05")?.phase).toBe("finished");
  expect((await db.query(`SELECT (race_start_at AT TIME ZONE 'Europe/Moscow')::date::text AS date
    FROM compendium_star_race_standings_snapshots`)).rows).toEqual([{ date: "2026-10-05" }]);
});
