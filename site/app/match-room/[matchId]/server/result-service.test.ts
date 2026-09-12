import { PGlite } from "@electric-sql/pglite";
import type { PoolClient } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@/lib/auth";

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ transaction: mocks.transaction }));

import { reportMatchRoomGame, resolveMatchRoomDispute } from "./result-service";

let db: PGlite;
function actor(discordId: string, isAdmin = false): AuthUser {
  return {
    discordId,
    dotaId: "",
    username: "test",
    avatarUrl: null,
    playerName: "Test",
    realName: null,
    positions: null,
    serverName: "Test",
    isAdmin,
  };
}
const captainA = actor("10001");
const captainB = actor("10002");
const organizer = actor("99999", true);

function useTestTransactions(database: PGlite) {
  mocks.transaction.mockImplementation(async (callback) => database.transaction(async (transaction) => {
    const client = {
      query: async (sql: string, values?: unknown[]) => {
        const result = await transaction.query(sql, values);
        return { rows: result.rows, rowCount: result.affectedRows || result.rows.length };
      },
    } as PoolClient;
    return callback(client);
  }));
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE players (discord_id bigint PRIMARY KEY, ingame_name text);
    CREATE TABLE tournaments (
      id bigint PRIMARY KEY, slug text, name text, tournament_type text,
      ordinary_match_rooms_enabled boolean
    );
    CREATE TABLE tournament_team_applications (
      id bigint PRIMARY KEY, tournament_id bigint, team_name text,
      captain_discord_id bigint, captain_name_snapshot text
    );
    CREATE TABLE tournament_matches (
      id bigint PRIMARY KEY, tournament_id bigint, stage text, best_of smallint,
      status text, team_a_application_id bigint, team_b_application_id bigint,
      team_a_score smallint, team_b_score smallint, result_type text,
      team_a_result_label text, team_b_result_label text, decision_note text,
      updated_at timestamptz
    );
    CREATE TABLE ordinary_match_rooms (
      match_id bigint PRIMARY KEY, status text DEFAULT 'active',
      current_game_number smallint DEFAULT 1, updated_at timestamptz DEFAULT NOW()
    );
    CREATE TABLE ordinary_match_game_reports (
      match_id bigint, game_number smallint, captain_id bigint,
      dota_match_id text, winner_side char(1), submitted_at timestamptz DEFAULT NOW(),
      PRIMARY KEY (match_id, game_number, captain_id)
    );
    CREATE TABLE ordinary_match_games (
      match_id bigint, game_number smallint, dota_match_id text,
      winner_side char(1), resolution_method text, resolved_by bigint,
      resolved_at timestamptz DEFAULT NOW(), PRIMARY KEY (match_id, game_number)
    );
    CREATE TABLE tournament_audit_log (
      id bigserial PRIMARY KEY, tournament_id bigint, actor_discord_id bigint,
      action text, entity_type text, entity_id text, details jsonb
    );
  `);
  useTestTransactions(db);
});

afterAll(async () => db.close());

beforeEach(async () => {
  await db.exec(`
    TRUNCATE players, tournaments, tournament_team_applications,
      tournament_matches, ordinary_match_rooms, ordinary_match_game_reports,
      ordinary_match_games, tournament_audit_log RESTART IDENTITY;
    INSERT INTO players VALUES (10001, 'Captain A'), (10002, 'Captain B'), (99999, 'Admin');
    INSERT INTO tournaments VALUES (1, 'cup', 'Cup', 'ordinary', TRUE);
    INSERT INTO tournament_team_applications VALUES
      (11, 1, 'Team A', 10001, 'Captain A'),
      (12, 1, 'Team B', 10002, 'Captain B');
    INSERT INTO tournament_matches VALUES
      (100, 1, 'Final', 1, 'scheduled', 11, 12, NULL, NULL, 'normal', NULL, NULL, NULL, NOW());
  `);
});

describe("ordinary match result persistence", () => {
  it("saves the first captain report and finishes on matching confirmation", async () => {
    await reportMatchRoomGame(100, captainA, "8995644936", "a");
    const waiting = await db.query<{ reports: number }>(
      "SELECT COUNT(*)::int AS reports FROM ordinary_match_game_reports",
    );
    expect(waiting.rows[0].reports).toBe(1);

    await reportMatchRoomGame(100, captainB, "8995644936", "a");
    const match = await db.query<{ status: string; team_a_score: number; team_b_score: number }>(
      "SELECT status, team_a_score::int, team_b_score::int FROM tournament_matches WHERE id = 100",
    );
    expect(match.rows[0]).toEqual({ status: "finished", team_a_score: 1, team_b_score: 0 });
  });

  it("opens a dispute and accepts the organizer decision", async () => {
    await reportMatchRoomGame(100, captainA, "8995644936", "a");
    await reportMatchRoomGame(100, captainB, "8995644937", "b");
    expect((await db.query("SELECT status FROM ordinary_match_rooms")).rows[0]).toEqual({ status: "disputed" });
    await resolveMatchRoomDispute(100, organizer, "8995644936", "a");
    expect((await db.query("SELECT status FROM ordinary_match_rooms")).rows[0]).toEqual({ status: "completed" });
  });
});
