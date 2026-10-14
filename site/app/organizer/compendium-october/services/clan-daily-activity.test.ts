import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), members: vi.fn() }));
vi.mock("@/lib/db", () => ({ query: mocks.query }));
vi.mock("./clan-members", () => ({ loadOctoberClanMembers: mocks.members }));
import { loadClanDailyActivity } from "./clan-daily-activity";

const db = new PGlite();
beforeAll(async () => {
  await db.exec(`CREATE TABLE october_compendium_clan_members (player_id bigint);
    INSERT INTO october_compendium_clan_members VALUES (1), (2), (3), (4);
    CREATE TABLE compendium_star_events (player_id bigint, amount int, earned_at timestamptz);
    INSERT INTO compendium_star_events VALUES
      (1, 99, '2026-10-13 23:59:59+03'), (1, 2, '2026-10-14 00:00+03'),
      (1, 1, '2026-10-14 23:59:59+03'), (1, 77, '2026-10-15 00:00+03'),
      (2, 5, '2026-10-14 12:00+03'), (3, 0, '2026-10-14 12:00+03'),
      (4, 2, '2026-10-14 12:00+03'), (4, -2, '2026-10-14 12:01+03');
    CREATE TABLE compendium_daily_quest_sets (id bigint, moscow_date date);
    INSERT INTO compendium_daily_quest_sets VALUES (1, '2026-10-14'), (2, '2026-10-13');
    CREATE TABLE compendium_daily_quests (id bigint, quest_set_id bigint, position int);
    INSERT INTO compendium_daily_quests VALUES (1, 1, 1), (2, 1, 3), (3, 2, 2);
    CREATE TABLE compendium_user_quest_completions (daily_quest_id bigint, player_id bigint);
    INSERT INTO compendium_user_quest_completions VALUES (1, 1), (2, 2), (3, 1), (1, 2);
    CREATE TABLE october_compendium_clan_outing_completions (player_id bigint, moscow_date date);
    INSERT INTO october_compendium_clan_outing_completions VALUES (1, '2026-10-14'), (2, '2026-10-13');
    CREATE TABLE compendium_star_race_quest_completions (player_id bigint, moscow_date date);
    INSERT INTO compendium_star_race_quest_completions VALUES (1, '2026-10-14'), (2, '2026-10-13');
    CREATE TABLE october_compendium_rune_challenge_completions (player_id bigint, moscow_date date);
    INSERT INTO october_compendium_rune_challenge_completions VALUES (1, '2026-10-14'), (2, '2026-10-14');
    CREATE TABLE player_discord_roles (player_id bigint, role_name text);
    INSERT INTO player_discord_roles VALUES (1, 'Руна Регенерации'), (2, 'Руна Воды');`);
  mocks.members.mockResolvedValue([1, 2, 3, 4].map((id) => ({ discordId: String(id), dotaId: String(id),
    playerName: `Игрок ${id}`, avatarUrl: null, clanId: id === 2 ? "panacea" : "morbus", totalPoints: 100 })));
  mocks.query.mockImplementation(async (sql: string, values: unknown[]) => (await db.query(sql, values)).rows);
}, 20000);
afterAll(async () => db.close());

it("ranks positive daily earnings, respecting Moscow midnight and excluding zero net stars", async () => {
  const result = await loadClanDailyActivity(new Date("2026-10-14T12:00:00+03:00"));
  expect(result.members.map((member) => [member.discordId, member.dailyStars])).toEqual([["2", 5], ["1", 3]]);
  expect(result.resetsAt).toBe("2026-10-14T21:00:00.000Z");
  expect(result.members[1].quests.map((quest) => quest.isCompleted)).toEqual([true, true, false, true, true]);
  expect(result.members[0].quests[0].isCompleted).toBe(false);
  expect(result.members[0].quests[3].isCompleted).toBe(false);
  expect(result.members[0].quests[4]).toMatchObject({ isCompleted: false, isAvailable: false, rewardStars: 1 });
  expect(result.members[1].quests[0].description).toContain(".");
});

it("starts a new daily list and resets every quest at midnight", async () => {
  const result = await loadClanDailyActivity(new Date("2026-10-15T00:00:00+03:00"));
  expect(result.members.map((member) => member.dailyStars)).toEqual([77]);
  expect(result.members[0].quests.every((quest) => !quest.isCompleted)).toBe(true);
});

it("uses doubled rewards on Friday even for empty quest circles", async () => {
  await db.exec("INSERT INTO compendium_star_events VALUES (1, 1, '2026-10-16 12:00+03');");
  const result = await loadClanDailyActivity(new Date("2026-10-16T12:00:00+03:00"));
  expect(result.members[0].quests.slice(1).map((quest) => quest.rewardStars)).toEqual([2, 2, 2, 2]);
});

it.each(["2026-10-04T23:59:59+03:00", "2026-10-26T00:00:00+03:00"])("stops outside the compendium: %s", async (date) => {
  expect(await loadClanDailyActivity(new Date(date))).toMatchObject({ isActive: false, members: [] });
});
