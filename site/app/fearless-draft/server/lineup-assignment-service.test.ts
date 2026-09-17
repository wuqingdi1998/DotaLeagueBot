import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import type { PoolClient } from "pg";

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/lib/db", () => mocks);

import {
  loadDraftLineupAssignment,
  submitDraftLineupAssignment,
} from "./lineup-assignment-service";
import { selectDraftHero } from "./series-service";
import type { DraftLobbyPlayer } from "../model/snapshot";

let database: PGlite;
const captains = ["10001", "10006"] as const;
const lobbyPlayers: DraftLobbyPlayer[] = Array.from({ length: 10 }, (_, index) => ({
  id: String(10001 + index),
  dotaId: String(20001 + index),
  name: `Player ${index + 1}`,
  avatarUrl: null,
  teamSide: index < 5 ? "a" : "b",
  isOnline: true,
  slotNumber: index % 5 + 1,
  isCaptain: index === 0 || index === 5,
}));

function transactionWith(database: PGlite) {
  return async <T>(callback: (client: PoolClient) => Promise<T>) =>
    database.transaction(async (transaction) => callback({
      query: async (sql: string, values?: unknown[]) => {
        const result = await transaction.query(sql, values);
        return {
          rows: result.rows,
          rowCount: result.affectedRows || result.rows.length,
        };
      },
    } as PoolClient));
}

function assignments(firstHeroId: number, firstPlayerId: number) {
  return Array.from({ length: 5 }, (_, index) => ({
    heroId: firstHeroId + index,
    playerId: String(firstPlayerId + index),
  }));
}

async function queryClient(): Promise<PoolClient> {
  return {
    query: async (sql: string, values?: unknown[]) => {
      const result = await database.query(sql, values);
      return { rows: result.rows, rowCount: result.affectedRows || result.rows.length };
    },
  } as PoolClient;
}

beforeAll(async () => {
  database = new PGlite();
  await database.exec(`
    CREATE TABLE players (discord_id bigint PRIMARY KEY, ingame_name text);
    CREATE TABLE season_match_rooms (match_id bigint PRIMARY KEY, status text, updated_at timestamptz);
    CREATE TABLE season_match_room_players (
      match_id bigint, player_id bigint, team_side char(1), slot_number integer
    );
    CREATE TABLE draft_series (
      id bigserial PRIMARY KEY, player1_id bigint, player2_id bigint, format text,
      status text, current_map integer, map1_coin_toss_winner_id bigint,
      end_requested_by bigint, end_requested_at timestamptz,
      player1_ready_for_next_map boolean, player2_ready_for_next_map boolean,
      season_match_id bigint, updated_at timestamptz
    );
    CREATE TABLE draft_maps (
      id bigserial PRIMARY KEY, series_id bigint, map_number integer, status text,
      first_chooser_id bigint, coin_toss_segment integer, first_choice text,
      second_choice text,
      radiant_player_id bigint, first_pick_player_id bigint, current_step integer,
      step_started_at timestamptz, player1_reserve_seconds float8,
      player2_reserve_seconds float8, preview_hero_id integer, version integer,
      completed_at timestamptz
    );
    CREATE TABLE draft_actions (
      map_id bigint, step integer, actor_id bigint, action_type text, hero_id integer,
      is_automatic boolean DEFAULT false, created_at timestamptz DEFAULT now()
    );
    CREATE TABLE draft_hero_suggestions (map_id bigint, hero_id integer);
    CREATE TABLE draft_lineup_assignments (
      map_id bigint, captain_id bigint, hero_id integer, player_id bigint,
      submitted_at timestamptz, PRIMARY KEY (map_id, captain_id, hero_id),
      UNIQUE (map_id, captain_id, player_id)
    );
  `);
  mocks.transaction.mockImplementation(transactionWith(database));
}, 30_000);

afterAll(async () => database.close());

beforeEach(async () => {
  await database.exec(`
    TRUNCATE players, season_match_rooms, season_match_room_players,
      draft_series, draft_maps, draft_actions, draft_lineup_assignments
      , draft_hero_suggestions
      RESTART IDENTITY;
    INSERT INTO players
      SELECT id, 'Player ' || id FROM generate_series(10001, 10010) AS id;
    INSERT INTO season_match_rooms VALUES (10, 'drafting', NOW());
    INSERT INTO season_match_room_players
      SELECT 10, id, CASE WHEN id < 10006 THEN 'a' ELSE 'b' END,
        (id - 10001) % 5 + 1
      FROM generate_series(10001, 10010) AS id;
    INSERT INTO draft_series VALUES (
      1, 10001, 10006, 'BO2', 'DRAFTING', 1, 10001,
      NULL, NULL, FALSE, FALSE, 10, NOW()
    );
    INSERT INTO draft_maps VALUES (
      1, 1, 1, 'LINEUP_ASSIGNMENT', 10001, 1, 'RADIANT', 'FIRST',
      10001, 10001, 24, NULL, 100, 100, NULL, 25, NULL
    );
    INSERT INTO draft_actions
      SELECT 1, id - 1, CASE WHEN id <= 5 THEN 10001 ELSE 10006 END,
        'PICK', id
      FROM generate_series(1, 10) AS id;
  `);
});

describe("season Fearless Draft lineup assignment", () => {
  it("moves the final season pick into assignment without starting the game", async () => {
    await database.exec(`
      UPDATE draft_maps SET status = 'DRAFTING', current_step = 23,
        first_pick_player_id = 10006, step_started_at = NOW();
      TRUNCATE draft_actions;
      INSERT INTO draft_actions (map_id, step, actor_id, action_type, hero_id)
        SELECT 1, id - 1, 10006, 'BAN', id + 20
        FROM generate_series(1, 23) AS id;
    `);
    await selectDraftHero("10001", 1, 25);
    expect((await database.query(
      "SELECT status, current_step FROM draft_maps",
    )).rows[0]).toEqual({ status: "LINEUP_ASSIGNMENT", current_step: 24 });
    expect((await database.query("SELECT status FROM draft_series")).rows[0])
      .toEqual({ status: "DRAFTING" });
    expect((await database.query("SELECT status FROM season_match_rooms")).rows[0])
      .toEqual({ status: "drafting" });
  });

  it("still completes a standalone draft immediately after the final pick", async () => {
    await database.exec(`
      UPDATE draft_series SET season_match_id = NULL;
      UPDATE draft_maps SET status = 'DRAFTING', current_step = 23,
        first_pick_player_id = 10006, step_started_at = NOW();
      TRUNCATE draft_actions;
      INSERT INTO draft_actions (map_id, step, actor_id, action_type, hero_id)
        SELECT 1, id - 1, 10006, 'BAN', id + 20
        FROM generate_series(1, 23) AS id;
    `);
    await selectDraftHero("10001", 1, 25);
    expect((await database.query(
      "SELECT status, current_step FROM draft_maps",
    )).rows[0]).toEqual({ status: "COMPLETE", current_step: 24 });
    expect((await database.query("SELECT status FROM draft_series")).rows[0])
      .toEqual({ status: "MAP_COMPLETE" });
  });

  it("keeps the first lineup hidden from opponents and reveals both together", async () => {
    await submitDraftLineupAssignment("10001", assignments(1, 10001));
    const client = await queryClient();
    const teammateView = await loadDraftLineupAssignment(
      client, 1, captains, "10002", lobbyPlayers,
    );
    const opponentView = await loadDraftLineupAssignment(
      client, 1, captains, "10007", lobbyPlayers,
    );
    expect(teammateView.assignments).toHaveLength(5);
    expect(opponentView).toMatchObject({
      player1Submitted: true,
      player2Submitted: false,
      isRevealed: false,
      assignments: [],
    });
    expect((await database.query("SELECT status FROM draft_maps")).rows[0])
      .toEqual({ status: "LINEUP_ASSIGNMENT" });

    await submitDraftLineupAssignment("10006", assignments(6, 10006));
    const revealed = await loadDraftLineupAssignment(
      client, 1, captains, "10007", lobbyPlayers,
    );
    expect(revealed.isRevealed).toBe(true);
    expect(revealed.assignments).toHaveLength(10);
    expect((await database.query("SELECT status FROM draft_maps")).rows[0])
      .toEqual({ status: "COMPLETE" });
    expect((await database.query("SELECT status FROM draft_series")).rows[0])
      .toEqual({ status: "MAP_COMPLETE" });
    expect((await database.query("SELECT status FROM season_match_rooms")).rows[0])
      .toEqual({ status: "playing" });
  });

  it("rejects incomplete and foreign hero assignments without saving a partial lineup", async () => {
    await expect(submitDraftLineupAssignment(
      "10001",
      assignments(1, 10001).slice(0, 4),
    )).rejects.toMatchObject({ status: 400 });
    await expect(submitDraftLineupAssignment(
      "10001",
      assignments(2, 10001),
    )).rejects.toMatchObject({ status: 400 });
    expect((await database.query(
      "SELECT COUNT(*)::int AS count FROM draft_lineup_assignments",
    )).rows[0]).toEqual({ count: 0 });
  });
});
