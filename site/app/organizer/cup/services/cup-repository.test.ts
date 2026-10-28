import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createCupBoard, moveCupPlayer } from "../model/cup-board";

const database = vi.hoisted(() => ({ current: null as PGlite | null }));
vi.mock("@/lib/db", () => ({
  query: async (sql: string, values: unknown[] = []) => (await database.current!.query(sql, values)).rows,
  one: async (sql: string, values: unknown[] = []) => (await database.current!.query(sql, values)).rows[0] ?? null,
}));
vi.mock("@/lib/participants", () => ({
  loadParticipantDirectory: async () => [1, 2, 3, 4, 5].map((id) => ({
    identityId: String(id), discordId: String(id), nickname: `Игрок ${id}`, tier: id, positions: "2/4",
  })),
}));

import { loadCupConstructor, saveCupConstructor } from "./cup-repository";

beforeAll(async () => {
  database.current = new PGlite();
  await database.current.exec(`
    CREATE TABLE tournaments(id bigint, name text, tournament_type text, status text, start_at timestamptz);
    CREATE TABLE season_rounds(id bigint, tournament_id bigint, round_kind text);
    CREATE TABLE season_lobbies(id bigint, round_id bigint);
    CREATE TABLE season_matches(id bigint, lobby_id bigint, status text, result text);
    CREATE TABLE season_match_participants(match_id bigint, player_id bigint);
    CREATE TABLE season_match_substitutions(match_id bigint, game_id bigint, incoming_player_id bigint, outgoing_player_id bigint);
    CREATE TABLE player_identity_members(identity_id bigint, player_id bigint);
    CREATE TABLE season_participants(tournament_id bigint, player_id bigint, standings_snapshot jsonb);
    INSERT INTO tournaments VALUES (1,'League 9','seasonal','active','2026-09-06'), (2,'League 8','seasonal','archived','2026-02-06');
    INSERT INTO season_rounds VALUES (1,1,'regular'), (2,1,'regular'), (3,2,'regular');
    INSERT INTO season_lobbies VALUES (1,1), (2,2), (3,3);
    INSERT INTO season_matches VALUES (1,1,'completed','team_a'), (2,2,'published','draw'), (3,2,'draft',NULL), (4,3,'completed','team_a');
    INSERT INTO season_match_participants VALUES (1,1), (2,1), (1,2), (2,2), (1,3), (3,3), (4,5);
    INSERT INTO season_match_substitutions VALUES (2,NULL,4,2), (1,10,4,3), (1,11,4,3);
    INSERT INTO player_identity_members VALUES (1,1),(2,2),(3,3),(4,4),(5,5);
  `);
  await database.current.exec(readFileSync(new URL("../../../../../bot/database/migrations/0192_cup_constructor.sql", import.meta.url), "utf8"));
});
afterAll(async () => { await database.current?.close(); });

describe("cup constructor persistence and live roster", () => {
  it("uses the current league, finished results, substitutions and current profile tiers", async () => {
    const snapshot = await loadCupConstructor();
    expect(snapshot.leagueName).toBe("League 9");
    expect(snapshot.board.pool).toEqual(["1", "4"]);
    expect(snapshot.players.map((p) => p.matchCount)).toEqual([2, 1, 1, 2, 0]);
    expect(snapshot.players[0]).toMatchObject({ tier: 1, positions: "2/4" });
    expect(snapshot.revision).toBe(0);
  });

  it("saves independent slots, manual additions and readiness and prevents stale overwrites", async () => {
    const initial = await loadCupConstructor();
    let board = { ...initial.board, pool: [...initial.board.pool, "5"], readyPlayerIds: ["5"] };
    board = moveCupPlayer(board, "5", { basket: 0, slot: 5 });
    expect(await saveCupConstructor(board, 0)).toEqual({ revision: 1 });
    const loaded = await loadCupConstructor();
    expect(loaded.board).toEqual(board);
    expect(loaded.board.baskets[0]).toEqual([null, null, null, null, null, "5"]);
    await expect(saveCupConstructor(initial.board, 0)).rejects.toMatchObject({ status: 409 });
    await expect(saveCupConstructor(initial.board, 2)).rejects.toMatchObject({ status: 409 });
    expect((await loadCupConstructor()).board).toEqual(board);
    expect(await saveCupConstructor(createCupBoard([]), 1)).toEqual({ revision: 2 });
    expect((await loadCupConstructor()).board.pool).toEqual([]);
  });

  it("rejects invented players and malformed state without changing saved data", async () => {
    const board = (await loadCupConstructor()).board;
    await expect(saveCupConstructor({ ...board, pool: ["999"] }, 2)).rejects.toMatchObject({ status: 400 });
    await expect(saveCupConstructor({ ...board, pool: ["1", "1"] }, 2)).rejects.toMatchObject({ status: 400 });
    await expect(saveCupConstructor(board, "2")).rejects.toMatchObject({ status: 400 });
    expect((await loadCupConstructor()).revision).toBe(2);
  });
});
