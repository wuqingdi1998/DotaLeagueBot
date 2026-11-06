import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import type { PoolClient } from "pg";
import {
  loadSeasonLobbyPairHistory,
  seasonLobbyPairHistoryPenalty,
  seasonLobbyPairKey,
} from "./season-lobby-pair-history";

describe("season lobby pair history", () => {
  it("loads frequencies from every prior completed regular-round match", async () => {
    let queryText = "";
    const client = {
      query: async (sql: string, values: unknown[]) => {
        queryText = sql;
        expect(values).toEqual([12]);
        return {
          rows: [{
            first_player_id: "10",
            opponent_count: 2,
            second_player_id: "20",
            teammate_count: 3,
          }],
        };
      },
    } as unknown as PoolClient;

    const history = await loadSeasonLobbyPairHistory(client, 12);

    expect(history.teammateCounts.get("10:20")).toBe(3);
    expect(history.opponentCounts.get("10:20")).toBe(2);
    expect(queryText).toContain("match.status = 'completed'");
    expect(queryText).toContain(
      "historical_round.round_number < current.round_number",
    );
    expect(queryText).toContain(
      "first_player.team_side <> second_player.team_side",
    );
    expect(queryText).not.toContain("LIMIT 1");
  });

  it("sums repeated teammates and repeated opponents separately", () => {
    const history = {
      teammateCounts: new Map([
        [seasonLobbyPairKey("1", "2"), 3],
        [seasonLobbyPairKey("3", "4"), 1],
      ]),
      opponentCounts: new Map([
        [seasonLobbyPairKey("1", "3"), 5],
        [seasonLobbyPairKey("2", "4"), 2],
      ]),
    };

    expect(seasonLobbyPairHistoryPenalty(
      [{ playerId: "1" }, { playerId: "2" }],
      [{ playerId: "3" }, { playerId: "4" }],
      history,
    )).toEqual([4, 7]);
  });

  it("counts every prior completed match but excludes unfinished and future ones", async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        CREATE TABLE season_rounds (
          id bigint PRIMARY KEY, tournament_id bigint,
          round_number int, round_kind text
        );
        CREATE TABLE season_lobbies (id bigint PRIMARY KEY, round_id bigint);
        CREATE TABLE season_matches (
          id bigint PRIMARY KEY, lobby_id bigint, status text
        );
        CREATE TABLE season_match_participants (
          match_id bigint, player_id bigint, team_side text
        );
        CREATE TABLE player_identity_members (
          player_id bigint, identity_id bigint
        );
        CREATE TABLE player_identities (
          id bigint, registered_player_id bigint
        );
        INSERT INTO season_rounds VALUES
          (1, 10, 1, 'regular'), (2, 10, 2, 'regular'),
          (3, 10, 3, 'regular'), (4, 20, 1, 'regular');
        INSERT INTO season_lobbies VALUES (11, 1), (12, 2), (13, 3), (14, 4);
        INSERT INTO season_matches VALUES
          (21, 11, 'completed'), (22, 12, 'completed'),
          (23, 12, 'published'), (24, 13, 'completed'),
          (25, 14, 'completed');
        INSERT INTO season_match_participants VALUES
          (21, 100, 'a'), (21, 200, 'a'), (21, 300, 'b'),
          (22, 100, 'a'), (22, 200, 'a'), (22, 300, 'b'),
          (23, 100, 'b'), (23, 200, 'a'),
          (24, 100, 'b'), (24, 200, 'a'),
          (25, 100, 'b'), (25, 200, 'a');
      `);

      const history = await loadSeasonLobbyPairHistory(
        db as unknown as PoolClient,
        3,
      );

      expect(history.teammateCounts.get("100:200")).toBe(2);
      expect(history.opponentCounts.get("100:300")).toBe(2);
      expect(history.opponentCounts.has("100:200")).toBe(false);
    } finally {
      await db.close();
    }
  }, 15000);
});
