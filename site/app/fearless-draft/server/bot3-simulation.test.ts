import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), one: vi.fn(), transaction: vi.fn(), now: new Date("2026-10-09T12:00:00Z") }));
vi.mock("@/lib/db", () => mocks);
vi.mock("./database-clock", () => ({ databaseNow: async () => mocks.now }));
import { createBot3Captains, loadBot3Room, processBot3Captains } from "./bot3-captain-service";
import { isBotActionDue, clearBotActionDue, nextBotActionDueAt } from "./bot-timing-service";

let database: PGlite;
let client: PoolClient;
beforeAll(async () => {
  database = new PGlite();
  await database.exec(`
    CREATE TABLE players (discord_id bigint PRIMARY KEY, steam_id32 bigint, ingame_name text,
      real_name text, positions text, avatar_url text, internal_rating int, rank_tier int, is_archived boolean DEFAULT false);
    CREATE TABLE web_sessions (discord_id bigint, discord_avatar_url text, created_at timestamptz);
    CREATE TABLE draft_series (id bigint PRIMARY KEY, player1_id bigint, player2_id bigint, status text, current_map int);
    CREATE TABLE draft_maps (id bigint PRIMARY KEY, series_id bigint, map_number int);
    INSERT INTO players SELECT n, n+100, 'Участник ' || n, NULL, '3/4', NULL, 5, 50, false FROM generate_series(1,10) n;
    INSERT INTO draft_series VALUES (1,1,9223372036854775806,'CHOOSING',1);
    INSERT INTO draft_maps VALUES (1,1,1);
  `);
  await database.exec(readFileSync(new URL("../../../../bot/database/migrations/0176_bot3_captain_voting_and_timing.sql", import.meta.url), "utf8"));
  client = { query: async (sql: string, values?: unknown[]) => {
    const result = await database.query(sql, values);
    return { rows: result.rows, rowCount: result.affectedRows || result.rows.length };
  } } as PoolClient;
  mocks.query.mockImplementation(async (sql: string, values?: unknown[]) => (await database.query(sql, values)).rows);
  mocks.one.mockImplementation(async (sql: string, values?: unknown[]) => (await database.query(sql, values)).rows[0] ?? null);
  mocks.transaction.mockImplementation(async (callback: (client: PoolClient) => Promise<unknown>) => callback(client));
});
afterAll(async () => { await database?.close(); });

describe("persisted Bot3 simulation", () => {
  it("stores real positions, initially hides captains and keeps the human response across reloads", async () => {
    await createBot3Captains(client, 1, "1");
    const initial = await loadBot3Room(client, 1, false, mocks.now.toISOString());
    expect(initial?.players).toHaveLength(10);
    expect(initial?.players.every((player) => player.positions === "3/4" && player.tier === 5 && !player.isCaptain)).toBe(true);
    await processBot3Captains("1", { action: "BOT3_CAPTAIN_INTEREST", value: true });
    expect((await loadBot3Room(client, 1, false, mocks.now.toISOString()))?.ownCaptainInterest).toBe(true);
    await expect(processBot3Captains("1", { action: "BOT3_CAPTAIN_INTEREST", value: false })).rejects.toThrow("уже сохранён");
    await expect(processBot3Captains("2", { action: "BOT3_CAPTAIN_INTEREST", value: true })).rejects.toThrow("не найден");
    for (let stage = 0; stage < 6; stage++) {
      mocks.now = new Date(mocks.now.getTime() + 70_000);
      await processBot3Captains("1");
    }
    const completed = await loadBot3Room(client, 1, false, mocks.now.toISOString());
    expect(completed?.status).toBe("drafting");
    expect(completed?.players.filter((player) => player.isCaptain)).toHaveLength(2);
  });

  it("keeps the same turn delay on repeated checks and excludes completed decisions from the scheduler", async () => {
    expect(await isBotActionDue(1, "turn:1", new Date(Date.now() + 15_000))).toBe(false);
    const first = await database.query<{ bot_action_due_at: Date }>("SELECT bot_action_due_at FROM draft_maps WHERE id = 1");
    expect(await isBotActionDue(1, "turn:1", new Date(Date.now() + 15_000))).toBe(false);
    const second = await database.query<{ bot_action_due_at: Date }>("SELECT bot_action_due_at FROM draft_maps WHERE id = 1");
    expect(second.rows[0].bot_action_due_at).toEqual(first.rows[0].bot_action_due_at);
    expect(await nextBotActionDueAt()).toEqual(first.rows[0].bot_action_due_at);
    await database.exec("UPDATE draft_maps SET bot_action_due_at = NOW() - interval '1 second' WHERE id = 1");
    expect(await isBotActionDue(1, "turn:1", null)).toBe(true);
    await clearBotActionDue(1, "different-turn");
    expect(await nextBotActionDueAt()).not.toBeNull();
    await clearBotActionDue(1, "turn:1");
    expect(await nextBotActionDueAt()).toBeNull();
    await isBotActionDue(1, "cancelled-request", null);
    await clearBotActionDue(1);
    expect(await nextBotActionDueAt()).toBeNull();
  });
});
