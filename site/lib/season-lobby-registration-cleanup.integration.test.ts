import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { PoolClient } from "pg";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ transaction: mocks.transaction }));
import { updateSeasonLobbyConfiguration } from "@/app/api/admin/season/season-lobby-configuration-actions";
import { deleteSeasonRoundRegistration } from "@/app/api/admin/season/season-registration-actions";
import { removeUnstartedSeasonLobbyPlayer } from "./season-lobby-registration-cleanup";

let db: PGlite;
let client: PoolClient;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE tournaments (id bigint PRIMARY KEY, tournament_type text);
    CREATE TABLE close_events (id bigint, tournament_id bigint, series text);
    CREATE TABLE season_rounds (id bigint PRIMARY KEY, tournament_id bigint,
      round_kind text, scheduled_at timestamptz, status text,
      lobby_configuration_status text, updated_at timestamptz DEFAULT NOW());
    CREATE TABLE season_lobbies (id bigint PRIMARY KEY, round_id bigint);
    CREATE TABLE season_matches (id bigint PRIMARY KEY, lobby_id bigint,
      status text, host_player_id bigint, updated_at timestamptz DEFAULT NOW());
    CREATE TABLE season_match_participants (match_id bigint, player_id bigint,
      team_side text, tier_snapshot int, slot_number int);
    CREATE TABLE season_round_registrations (round_id bigint, player_id bigint,
      tier_snapshot int);
    CREATE TABLE season_match_rooms (match_id bigint PRIMARY KEY, status text,
      team_a_captain_id bigint, team_b_captain_id bigint,
      updated_at timestamptz DEFAULT NOW());
    CREATE TABLE season_match_games (match_id bigint, status text);
    CREATE TABLE draft_series (season_match_id bigint);
    CREATE TABLE season_match_substitutions (match_id bigint);
    CREATE TABLE season_match_room_presence (match_id bigint, player_id bigint);
    CREATE TABLE season_match_captain_preferences (match_id bigint, player_id bigint);
    CREATE TABLE season_match_captain_votes (match_id bigint, voter_player_id bigint,
      candidate_player_id bigint);
    CREATE TABLE season_match_captain_tiebreaks (match_id bigint,
      voter_player_id bigint, candidate_one_id bigint, candidate_two_id bigint,
      selected_candidate_id bigint);
    CREATE TABLE synced_notifications (match_id bigint);
    CREATE FUNCTION sync_season_lobby_notifications(target bigint)
    RETURNS void LANGUAGE sql AS 'INSERT INTO synced_notifications VALUES (target)';
    CREATE TABLE tournament_audit_log (tournament_id bigint, actor_discord_id bigint,
      action text, entity_type text, entity_id text, details jsonb);
    INSERT INTO tournaments VALUES (1, 'seasonal');
    INSERT INTO season_rounds VALUES
      (2, 1, 'regular', NOW() + INTERVAL '7 days', 'planned', 'editing', NOW()),
      (3, 1, 'regular', NOW() - INTERVAL '7 days', 'completed', 'published', NOW());
    INSERT INTO season_lobbies VALUES (4, 2), (5, 3);
    INSERT INTO season_matches VALUES
      (6, 4, 'draft', 10001, NOW()), (7, 5, 'completed', 10001, NOW());
    INSERT INTO season_match_participants VALUES
      (6, 10001, 'a', 5, 1), (7, 10001, 'a', 5, 1);
  `);
  await db.exec(readFileSync(new URL(
    "../../bot/database/migrations/0203_season_lobby_registration_cleanup.sql",
    import.meta.url,
  ), "utf8"));
  expect((await db.query("SELECT match_id FROM season_match_participants")).rows)
    .toEqual([{ match_id: 7 }]);
  await db.exec(readFileSync(new URL(
    "../../bot/database/migrations/0204_allow_unstarted_lobby_cleanup_without_schedule.sql",
    import.meta.url,
  ), "utf8"));
  client = { query: async (sql: string, values?: unknown[]) => {
    const result = await db.query(sql, values);
    return { rows: result.rows, rowCount: result.affectedRows || result.rows.length };
  } } as PoolClient;
  mocks.transaction.mockImplementation(async (work) => work(client));
}, 30_000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec(`
    DELETE FROM season_match_participants;
    DELETE FROM season_round_registrations;
    DELETE FROM season_match_rooms;
    DELETE FROM season_match_games;
    DELETE FROM draft_series;
    DELETE FROM season_match_substitutions;
    DELETE FROM season_match_room_presence;
    DELETE FROM season_match_captain_preferences;
    DELETE FROM season_match_captain_votes;
    DELETE FROM season_match_captain_tiebreaks;
    DELETE FROM synced_notifications;
    UPDATE season_rounds SET lobby_configuration_status = 'editing',
      scheduled_at = NOW() + INTERVAL '7 days' WHERE id = 2;
    UPDATE season_matches SET host_player_id = 10001, status = 'draft' WHERE id = 6;
    INSERT INTO season_round_registrations VALUES (2, 10001, 5);
    INSERT INTO season_match_participants VALUES
      (6, 10001, 'a', 5, 1), (6, 10002, 'b', 6, 1), (7, 10001, 'a', 5, 1);
  `);
});

it("removes an orphan through the organizer action without requiring registration", async () => {
  await db.exec("DELETE FROM season_round_registrations; INSERT INTO season_match_participants VALUES (6, 10001, 'a', 5, 1)");
  await updateSeasonLobbyConfiguration({ roundId: 2, action: "assign", playerId: "10001", matchId: null }, "20001");
  expect((await db.query("SELECT player_id FROM season_match_participants WHERE match_id = 6")).rows)
    .toEqual([{ player_id: 10002 }]);
  await updateSeasonLobbyConfiguration({ roundId: 2, action: "assign", playerId: "10001", matchId: null }, "20001");
});

it("still rejects assigning an unregistered player to a slot", async () => {
  await expect(updateSeasonLobbyConfiguration({ roundId: 2, action: "assign", playerId: "10003", matchId: 6 }, "20001"))
    .rejects.toMatchObject({ status: 400 });
});

it.each([null, "2000-01-01"])("allows editing an unstarted roster regardless of its date (%s)", async (date) => {
  await db.query("UPDATE season_rounds SET scheduled_at = $1 WHERE id = 2", [date]);
  await updateSeasonLobbyConfiguration({ roundId: 2, action: "assign", playerId: "10001", matchId: null }, "20001");
  expect((await db.query("SELECT player_id FROM season_match_participants WHERE match_id = 6")).rows)
    .toEqual([{ player_id: 10002 }]);
});

it("removes the registration and lobby place through the organizer registration action", async () => {
  await deleteSeasonRoundRegistration({ roundId: 2, playerId: "10001" }, "20001");
  expect((await db.query("SELECT * FROM season_round_registrations")).rows).toHaveLength(0);
  expect((await db.query("SELECT player_id FROM season_match_participants WHERE match_id = 6")).rows)
    .toEqual([{ player_id: 10002 }]);
  await expect(deleteSeasonRoundRegistration({ roundId: 2, playerId: "10001" }, "20001"))
    .rejects.toMatchObject({ status: 404 });
});

it("withdraws atomically, clears host/captain state and reopens incomplete published lobbies", async () => {
  await db.exec(`
    UPDATE season_rounds SET lobby_configuration_status = 'published' WHERE id = 2;
    INSERT INTO season_match_rooms VALUES (6, 'waiting', 10001, 10002, NOW());
    INSERT INTO season_match_room_presence VALUES (6, 10001);
    INSERT INTO season_match_captain_preferences VALUES (6, 10001);
    INSERT INTO season_match_captain_votes VALUES (6, 10002, 10001);
    INSERT INTO season_match_captain_tiebreaks VALUES (6, 10002, 10001, 10003, 10001);
  `);
  await db.exec(`
    BEGIN;
    DELETE FROM season_round_registrations WHERE round_id = 2 AND player_id = 10001;
    ROLLBACK;
  `);
  expect((await db.query("SELECT player_id FROM season_match_participants WHERE match_id = 6")).rows).toHaveLength(2);
  await db.exec("DELETE FROM season_round_registrations WHERE round_id = 2 AND player_id = 10001");
  expect((await db.query("SELECT host_player_id FROM season_matches WHERE id = 6")).rows[0]).toEqual({ host_player_id: null });
  expect((await db.query("SELECT team_a_captain_id, team_b_captain_id FROM season_match_rooms")).rows[0])
    .toEqual({ team_a_captain_id: null, team_b_captain_id: 10002 });
  for (const table of ["season_match_room_presence", "season_match_captain_preferences", "season_match_captain_votes", "season_match_captain_tiebreaks"]) {
    expect((await db.query(`SELECT * FROM ${table}`)).rows).toHaveLength(0);
  }
  expect((await db.query("SELECT lobby_configuration_status FROM season_rounds WHERE id = 2")).rows[0])
    .toEqual({ lobby_configuration_status: "editing" });
  expect((await db.query("SELECT * FROM synced_notifications")).rows).toHaveLength(1);
  expect((await db.query("SELECT player_id FROM season_match_participants WHERE match_id = 7")).rows).toHaveLength(1);
});

it.each(["room", "game", "draft", "substitution", "completed"])("preserves a started match (%s)", async (kind) => {
  const setup: Record<string, string> = {
    room: "INSERT INTO season_match_rooms VALUES (6, 'captain_voting', NULL, NULL, NOW())",
    game: "INSERT INTO season_match_games VALUES (6, 'completed')",
    draft: "INSERT INTO draft_series VALUES (6)",
    substitution: "INSERT INTO season_match_substitutions VALUES (6)",
    completed: "UPDATE season_matches SET status = 'completed' WHERE id = 6",
  };
  await db.exec(setup[kind]);
  await expect(removeUnstartedSeasonLobbyPlayer(client, 2, "10001"))
    .rejects.toMatchObject({ status: 409 });
  await db.exec("DELETE FROM season_round_registrations WHERE round_id = 2");
  expect((await db.query("SELECT * FROM season_match_participants WHERE match_id = 6")).rows).toHaveLength(2);
});
