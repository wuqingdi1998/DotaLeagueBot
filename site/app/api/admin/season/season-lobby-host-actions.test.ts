import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), sync: vi.fn() }));
vi.mock("@/lib/db", () => ({ transaction: mocks.transaction }));
vi.mock("./season-lobby-notification-actions", () => ({
  syncSeasonLobbyNotifications: mocks.sync,
}));

import { setSeasonLobbyHost } from "./season-lobby-host-actions";

let database: PGlite;

beforeAll(async () => {
  database = new PGlite();
  await database.exec(`
    CREATE TABLE tournaments (id bigint PRIMARY KEY, tournament_type text);
    CREATE TABLE season_rounds (id bigint PRIMARY KEY, tournament_id bigint,
      round_kind text, lobby_configuration_status text);
    CREATE TABLE season_lobbies (id bigint PRIMARY KEY, round_id bigint);
    CREATE TABLE season_matches (id bigint PRIMARY KEY, lobby_id bigint,
      status text, host_player_id bigint, updated_at timestamptz DEFAULT NOW());
    CREATE TABLE season_match_room_players (match_id bigint, player_id bigint);
    CREATE TABLE tournament_audit_log (tournament_id bigint, actor_discord_id bigint,
      action text, entity_type text, entity_id text, details jsonb);
    INSERT INTO tournaments VALUES (1, 'seasonal');
    INSERT INTO season_rounds VALUES (2, 1, 'regular', 'locked');
    INSERT INTO season_lobbies VALUES (3, 2);
    INSERT INTO season_matches (id, lobby_id, status) VALUES (4, 3, 'draft');
    INSERT INTO season_match_room_players VALUES (4, 10001), (4, 10002);
  `);
  await database.exec(readFileSync(new URL(
    "../../../../../bot/database/migrations/0148_season_lobby_host_roles.sql",
    import.meta.url,
  ), "utf8"));
  mocks.transaction.mockImplementation(async <T>(work: (client: PoolClient) => Promise<T>) =>
    database.transaction(async (transaction) => work({
      query: async (sql: string, values?: unknown[]) => {
        const result = await transaction.query(sql, values);
        return { rows: result.rows, rowCount: result.affectedRows || result.rows.length };
      },
    } as PoolClient)),
  );
}, 30_000);

afterAll(async () => { await database.close(); });
beforeEach(async () => {
  await database.exec(`
    UPDATE season_rounds SET lobby_configuration_status = 'locked';
    UPDATE season_matches SET status = 'draft', host_player_id = NULL;
    DELETE FROM season_lobby_host_role_members;
    DELETE FROM tournament_audit_log;
  `);
  mocks.sync.mockClear();
});

describe("season lobby host assignment", () => {
  it("assigns in a locked lobby, switches host, and confirms role tracking", async () => {
    await setSeasonLobbyHost({ matchId: 4, playerId: "10001" }, "20001");
    expect((await database.query("SELECT host_player_id::text FROM season_matches")).rows[0])
      .toEqual({ host_player_id: "10001" });
    expect(mocks.sync).not.toHaveBeenCalled();

    await database.exec("UPDATE season_rounds SET lobby_configuration_status = 'published'");
    await setSeasonLobbyHost({ matchId: 4, playerId: "10002" }, "20001");
    expect(mocks.sync).toHaveBeenCalledOnce();
    expect((await database.query("SELECT host_player_id::text FROM season_matches")).rows[0])
      .toEqual({ host_player_id: "10002" });
    expect((await database.query("SELECT player_id::text FROM season_lobby_host_role_members ORDER BY player_id")).rows)
      .toEqual([{ player_id: "10001" }, { player_id: "10002" }]);

    await setSeasonLobbyHost({ matchId: 4, playerId: null }, "20001");
    expect((await database.query("SELECT host_player_id FROM season_matches")).rows[0])
      .toEqual({ host_player_id: null });
  });

  it("rejects a stranger and a change after the final result", async () => {
    await expect(setSeasonLobbyHost({ matchId: 4, playerId: "10003" }, "20001"))
      .rejects.toMatchObject({ status: 409 });
    await setSeasonLobbyHost({ matchId: 4, playerId: "10001" }, "20001");
    await database.exec("UPDATE season_matches SET status = 'completed' WHERE id = 4");
    const expiry = (await database.query<{ host_role_expires_at: Date }>(
      "SELECT host_role_expires_at FROM season_matches",
    )).rows[0]
      .host_role_expires_at;
    expect(expiry).not.toBeNull();
    expect((await database.query(`
      SELECT host_role_expires_at BETWEEN NOW() + INTERVAL '9 minutes'
        AND NOW() + INTERVAL '11 minutes' AS is_ten_minutes
      FROM season_matches
    `)).rows[0]).toEqual({ is_ten_minutes: true });
    await database.exec("UPDATE season_matches SET status = 'completed' WHERE id = 4");
    expect((await database.query<{ host_role_expires_at: Date }>(
      "SELECT host_role_expires_at FROM season_matches",
    )).rows[0]
      .host_role_expires_at).toEqual(expiry);
    await expect(setSeasonLobbyHost({ matchId: 4, playerId: "10002" }, "20001"))
      .rejects.toMatchObject({ status: 409 });
  });
});
