import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import type { PoolClient } from "pg";
import { loadSeasonLobbyRoleHistory } from "./season-lobby-role-history";

describe("season lobby role history", () => {
  it("counts only completed past matches and compares each saved primary role", async () => {
    let queryText = "";
    const client = {
      query: async (sql: string, values: unknown[]) => {
        queryText = sql;
        expect(values).toEqual([108]);
        return {
          rows: [
            { player_id: "1", slot_number: 4, historical_primary_role: 2 },
            { player_id: "1", slot_number: 2, historical_primary_role: 2 },
            { player_id: "1", slot_number: 3, historical_primary_role: 3 },
            { player_id: "2", slot_number: 5, historical_primary_role: null },
          ],
        };
      },
    } as unknown as PoolClient;

    const history = await loadSeasonLobbyRoleHistory(client, 108, [
      { playerId: "1", positions: "2/4" },
      { playerId: "2", positions: "5/4" },
    ]);

    expect(history.get("1")).toEqual({ completedMatches: 3, primaryRoleMatches: 2 });
    expect(history.get("2")).toEqual({ completedMatches: 1, primaryRoleMatches: 1 });
    expect(queryText).toContain("match.status = 'completed'");
    expect(queryText).toContain("historical_round.round_number < target_round.round_number");
    expect(queryText).toContain("ranked.round_id = historical_round.id");
  });

  it("loads only prior completed matches from the same season", async () => {
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
          match_id bigint, player_id bigint, slot_number int
        );
        CREATE TABLE player_identity_members (player_id bigint, identity_id bigint);
        CREATE TABLE player_identities (id bigint, registered_player_id bigint);
        CREATE TABLE season_ranked_win_checks (
          round_id bigint, player_id bigint, primary_role int
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
          (21, 100, 2), (22, 100, 4), (23, 100, 2),
          (24, 100, 2), (25, 100, 2);
        INSERT INTO season_ranked_win_checks VALUES
          (1, 100, 2), (2, 100, 2);
      `);

      const history = await loadSeasonLobbyRoleHistory(
        db as unknown as PoolClient,
        3,
        [{ playerId: "100", positions: "2/4" }],
      );

      expect(history.get("100")).toEqual({
        completedMatches: 2,
        primaryRoleMatches: 1,
      });
    } finally {
      await db.close();
    }
  }, 15000);
});
