import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { loadActiveSeasonLobbyMatchId } from "./room-access";

const database = new PGlite();

vi.mock("@/lib/db", () => ({
  one: async (sql: string, params: string[]) =>
    (await database.query(sql, params)).rows[0] ?? null,
}));

beforeAll(async () => {
  await database.exec(`
    CREATE TABLE tournaments (id int, status text, tournament_type text);
    CREATE TABLE season_rounds (
      id int, tournament_id int, is_visible bool, round_kind text, lobby_configuration_status text
    );
    CREATE TABLE season_lobbies (id int, round_id int);
    CREATE TABLE season_matches (id int, lobby_id int, status text);
    CREATE TABLE season_match_rooms (match_id int, status text, updated_at timestamptz);
    CREATE TABLE season_match_room_players (match_id int, player_id bigint);

    INSERT INTO tournaments VALUES (1, 'active', 'seasonal'), (2, 'finished', 'seasonal');
    INSERT INTO season_rounds VALUES
      (1, 1, true, 'regular', 'published'), (2, 1, true, 'regular', 'locked'),
      (3, 1, false, 'regular', 'published'), (4, 2, true, 'regular', 'published'),
      (5, 1, true, 'finals', 'locked');
    INSERT INTO season_lobbies SELECT id, id FROM season_rounds;
    INSERT INTO season_matches VALUES
      (1, 1, 'published'), (2, 1, 'published'), (3, 1, 'published'), (4, 1, 'completed'),
      (5, 2, 'published'), (6, 3, 'published'), (7, 4, 'published'), (8, 5, 'published'),
      (9, 1, 'cancelled');
    INSERT INTO season_match_rooms VALUES
      (1, 'playing', '2026-11-10 12:00Z'), (2, 'break', '2026-11-10 12:05Z'),
      (3, 'waiting', now()), (4, 'completed', now()), (5, 'playing', now()),
      (6, 'playing', now()), (7, 'playing', now()), (8, 'drafting', now()),
      (9, 'playing', now());
    INSERT INTO season_match_room_players VALUES
      (1, 101), (2, 101), (2, 102), (3, 103), (4, 104), (5, 105),
      (6, 106), (7, 107), (8, 108), (9, 109);
  `);
});

afterAll(async () => database.close());

describe("active league lobby", () => {
  it.each([
    ["101", 1],
    ["102", 2],
    ["103", null],
    ["104", null],
    ["105", null],
    ["106", null],
    ["107", null],
    ["108", 8],
    ["109", null],
    ["110", null],
  ])("returns the eligible match for player %s", async (playerId, matchId) => {
    expect(await loadActiveSeasonLobbyMatchId(playerId)).toBe(matchId);
  });
});
