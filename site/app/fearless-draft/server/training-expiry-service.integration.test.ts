import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { PoolClient } from "pg";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(), one: vi.fn(), advanceAllBotDrafts: vi.fn(), publishLiveUpdate: vi.fn(),
}));
vi.mock("@/lib/db", () => mocks);
vi.mock("./bot-service", () => ({ advanceAllBotDrafts: mocks.advanceAllBotDrafts }));
vi.mock("./bot-timing-service", () => ({ nextBotActionDueAt: async () => null }));
vi.mock("./agreement-service", () => ({ settleExpiredDraftEndRequests: async () => [] }));
vi.mock("./series-service", () => ({
  settleExpiredDraftSeries: async () => false,
  settleFinalPickReview: async () => false,
}));
vi.mock("@/lib/live-update-events", () => ({
  fearlessDraftChannel: () => "standalone",
  publishLiveUpdate: mocks.publishLiveUpdate,
}));

import { FEARLESS_DRAFT_BOT_PLAYER_ID as botId } from "../model/bot";
import { DRAFT_TRAINING_INACTIVITY_MINUTES } from "../model/config";
import { processFearlessDraftDeadlines } from "./deadline-service";
import {
  ensureTrainingDraftNotExpired,
  expireInactiveTrainingDrafts,
  nextTrainingDraftExpiryAt,
  touchTrainingDraftActivity,
} from "./training-expiry-service";

const db = new PGlite();
const migration = (name: string) => readFileSync(
  new URL(`../../../../bot/database/migrations/${name}`, import.meta.url), "utf8",
);
let migratedActivity: { last_human_action_at: Date; updated_at: Date };

async function clientQuery(sql: string, values: unknown[] = []) {
  const result = await db.query(sql, values);
  return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0 };
}
const client = { query: clientQuery } as unknown as PoolClient;

beforeAll(async () => {
  await db.exec("CREATE TABLE players (discord_id bigint PRIMARY KEY)");
  await db.exec(migration("0061_fearless_draft.sql"));
  await db.exec(migration("0062_fearless_draft_agreements.sql"));
  await db.exec(`ALTER TABLE draft_series ADD COLUMN season_match_id bigint;
    ALTER TABLE draft_maps ADD COLUMN final_pick_review_ends_at timestamptz;
    ALTER TABLE draft_maps DROP CONSTRAINT draft_maps_status_check;
    INSERT INTO players VALUES (1), (2), (${botId});
    INSERT INTO draft_series(id, player1_id, player2_id, format,
      map1_coin_toss_winner_id, updated_at)
    VALUES (999, 1, ${botId}, 'BO3', 1, '2026-09-19T12:00:00Z')`);
  await db.exec(migration("0189_fearless_training_inactivity.sql"));
  migratedActivity = (await db.query<typeof migratedActivity>(
    "SELECT last_human_action_at, updated_at FROM draft_series WHERE id=999",
  )).rows[0];
  mocks.query.mockImplementation(async (sql: string, values: unknown[] = []) =>
    (await db.query(sql, values)).rows);
  mocks.one.mockImplementation(async (sql: string, values: unknown[] = []) =>
    (await db.query(sql, values)).rows[0] ?? null);
}, 20_000);

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.advanceAllBotDrafts.mockReset();
  await db.exec("TRUNCATE draft_series CASCADE");
});
afterAll(async () => db.close());

async function seedSeries(
  id: number,
  status = "DRAFTING",
  minutesAgo = DRAFT_TRAINING_INACTIVITY_MINUTES + 1,
  seasonMatchId: number | null = null,
  opponentId = botId,
) {
  await db.query(
    `INSERT INTO draft_series(id, player1_id, player2_id, format, status,
       map1_coin_toss_winner_id, season_match_id, last_human_action_at)
     VALUES ($1, 1, $2, 'BO3', $3, 1, $4, NOW() - ($5 * INTERVAL '1 minute'))`,
    [id, opponentId, status, seasonMatchId, minutesAgo],
  );
}

async function storedSeries(id: number) {
  return (await db.query<{
    status: string; last_human_action_at: Date; updated_at: Date;
    end_requested_by: string | null; player1_ready_for_next_map: boolean;
  }>("SELECT * FROM draft_series WHERE id=$1", [id])).rows[0];
}

it("backfills the real previous activity instead of extending every old session on publication", () => {
  expect(new Date(migratedActivity.last_human_action_at).toISOString())
    .toBe("2026-09-19T12:00:00.000Z");
  expect(migratedActivity.last_human_action_at).toEqual(migratedActivity.updated_at);
});

it("expires abandoned standalone sessions in every active stage and preserves official matches and history", async () => {
  await seedSeries(1, "CHOOSING");
  await seedSeries(2, "DRAFTING", 31, null, "2");
  await seedSeries(3, "MAP_COMPLETE");
  await seedSeries(4, "DRAFTING", 1);
  await seedSeries(5, "DRAFTING", 50_000, 256, "2");
  await seedSeries(6, "COMPLETE");
  await db.exec(`INSERT INTO draft_maps(id, series_id, map_number, first_chooser_id)
      VALUES (10, 2, 1, 1);
    INSERT INTO draft_actions(map_id, step, actor_id, action_type, hero_id)
      VALUES (10, 0, 1, 'BAN', 7);
    UPDATE draft_series SET end_requested_by=1, end_requested_at=NOW(),
      player1_ready_for_next_map=TRUE WHERE id=3`);

  expect((await expireInactiveTrainingDrafts()).sort()).toEqual([1, 2, 3]);
  expect((await db.query<{ status: string }>(
    "SELECT status FROM draft_series ORDER BY id",
  )).rows.map((row) => row.status)).toEqual([
    "ABANDONED", "ABANDONED", "ABANDONED", "DRAFTING", "DRAFTING", "COMPLETE",
  ]);
  expect((await storedSeries(3)).end_requested_by).toBeNull();
  expect((await storedSeries(3)).player1_ready_for_next_map).toBe(false);
  expect((await db.query("SELECT hero_id FROM draft_actions WHERE map_id=10")).rows)
    .toEqual([{ hero_id: 7 }]);
  expect(await expireInactiveTrainingDrafts()).toEqual([]);
});

it("expires at the thirty minute boundary and ignores fresh sessions", async () => {
  await seedSeries(1, "CHOOSING", DRAFT_TRAINING_INACTIVITY_MINUTES);
  await seedSeries(2, "CHOOSING", DRAFT_TRAINING_INACTIVITY_MINUTES - 1);
  expect(await expireInactiveTrainingDrafts()).toEqual([1]);
  expect((await storedSeries(2)).status).toBe("CHOOSING");
});

it("extends only real human activity; automated moves and online presence cannot keep a training alive", async () => {
  await seedSeries(1, "DRAFTING", 29);
  const before = (await storedSeries(1)).last_human_action_at;
  await ensureTrainingDraftNotExpired(client, 1);
  expect((await storedSeries(1)).last_human_action_at).toEqual(before);
  await touchTrainingDraftActivity(client, 1);
  expect((await storedSeries(1)).last_human_action_at.getTime()).toBeGreaterThan(before.getTime());

  await db.exec(`UPDATE draft_series SET last_human_action_at=NOW()-INTERVAL '31 minutes',
      updated_at=NOW() WHERE id=1;
    INSERT INTO draft_presence(player_id,series_id,heartbeat_at) VALUES (1,1,NOW())`);
  expect(await expireInactiveTrainingDrafts()).toEqual([1]);
});

it("rejects late human and automated work before cleanup and cannot revive a closed training", async () => {
  await seedSeries(1);
  const before = await storedSeries(1);
  await expect(ensureTrainingDraftNotExpired(client, 1)).rejects.toMatchObject({ status: 409 });
  await expect(touchTrainingDraftActivity(client, 1)).rejects.toMatchObject({ status: 409 });
  expect((await storedSeries(1)).last_human_action_at).toEqual(before.last_human_action_at);
  await expireInactiveTrainingDrafts();
  await expect(ensureTrainingDraftNotExpired(client, 1)).rejects.toMatchObject({ status: 409 });
  await expect(touchTrainingDraftActivity(client, 1)).rejects.toMatchObject({ status: 409 });
  expect((await storedSeries(1)).status).toBe("ABANDONED");

  await seedSeries(2, "DRAFTING", 50_000, 256, "2");
  await expect(ensureTrainingDraftNotExpired(client, 2)).resolves.toBeUndefined();
  await expect(touchTrainingDraftActivity(client, 2)).rejects.toMatchObject({ status: 409 });
  expect((await storedSeries(2)).status).toBe("DRAFTING");
});

it("rolls back activity along with a rejected human action", async () => {
  await seedSeries(1, "CHOOSING", 20);
  const before = (await storedSeries(1)).last_human_action_at;
  await expect(db.transaction(async (tx) => {
    const txClient = { query: async (sql: string, values: unknown[] = []) => {
      const result = await tx.query(sql, values);
      return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0 };
    } } as unknown as PoolClient;
    await touchTrainingDraftActivity(txClient, 1);
    throw new Error("Hero is no longer available");
  })).rejects.toThrow("Hero is no longer available");
  expect((await storedSeries(1)).last_human_action_at).toEqual(before);
});

it("schedules the persistent human deadline and cleans up before running bots without any open browser", async () => {
  await seedSeries(1, "CHOOSING");
  await seedSeries(2, "CHOOSING", 20);
  const expected = new Date((await storedSeries(2)).last_human_action_at.getTime()
    + DRAFT_TRAINING_INACTIVITY_MINUTES * 60_000);
  await db.exec(`INSERT INTO draft_maps(series_id,map_number,first_chooser_id,status,
      final_pick_review_ends_at) VALUES (1,1,1,'FINAL_PICK_REVIEW',NOW()+INTERVAL '1 minute')`);
  mocks.advanceAllBotDrafts.mockImplementation(async () => {
    expect((await storedSeries(1)).status).toBe("ABANDONED");
  });

  const result = await processFearlessDraftDeadlines();
  expect(result.expiredTrainings).toBe(1);
  expect(result.nextDueAt).toBe(expected.toISOString());
  expect(await nextTrainingDraftExpiryAt()).toEqual(expected);
  expect(mocks.advanceAllBotDrafts).toHaveBeenCalledTimes(2);
  expect(mocks.publishLiveUpdate).toHaveBeenCalledWith("standalone");
});
