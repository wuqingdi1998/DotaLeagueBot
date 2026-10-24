import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import type { PoolClient } from "pg";
import type { AuthUser } from "@/lib/auth";

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/lib/db", () => mocks);
import { loadFearlessDraftSnapshot } from "./snapshot-service";

let database: PGlite;
const queries: string[] = [];
const captain = { discordId: "10001", username: "Captain", serverName: "Captain",
  avatarUrl: null, isAdmin: false } as AuthUser;
const viewer = (id: string): AuthUser => ({ ...captain, discordId: id });

beforeAll(async () => {
  database = new PGlite();
  await database.exec(readFileSync(new URL("../../../tests/fixtures/draft-performance.sql", import.meta.url), "utf8"));
  for (const name of ["0061_fearless_draft.sql", "0062_fearless_draft_agreements.sql",
    "0068_fearless_draft_preview.sql", "0070_fearless_draft_bot_and_toss_segments.sql",
    "0097_fearless_draft_lobby_preview.sql", "0098_fearless_draft_hero_suggestions.sql",
    "0140_fearless_draft_lineup_assignments.sql", "0141_fearless_draft_season_lobby_preview.sql",
    "0150_fearless_draft_reliability.sql", "0176_bot3_captain_voting_and_timing.sql",
    "0188_fearless_draft_context_presence.sql", "0189_fearless_training_inactivity.sql"]) {
    if (name.startsWith("0188")) {
      await database.exec("ALTER TABLE draft_series ADD COLUMN season_match_id bigint REFERENCES season_matches(id)");
    }
    await database.exec(readFileSync(new URL(`../../../../bot/database/migrations/${name}`, import.meta.url), "utf8"));
  }
  await database.exec(`INSERT INTO players(discord_id, steam_id32, ingame_name)
    SELECT id, id + 100000, 'Player ' || id FROM generate_series(10001, 10012) AS id`);
  mocks.transaction.mockImplementation(async <T>(callback: (client: PoolClient) => Promise<T>) =>
    database.transaction(async (transaction) => callback({
      query: async (sql: string, values?: unknown[]) => {
        queries.push(sql);
        const result = await transaction.query(sql, values);
        return { rows: result.rows, rowCount: result.affectedRows || result.rows.length };
      },
    } as PoolClient)),
  );
}, 30_000);
afterAll(async () => { await database?.close(); });

beforeEach(async () => {
  await database.exec(`
    TRUNCATE season_matches CASCADE;
    TRUNCATE draft_queue, draft_invitations;
    INSERT INTO season_matches(id) VALUES (10), (11);
    INSERT INTO season_match_rooms(match_id, team_a_captain_id, team_b_captain_id)
      VALUES (10, 10001, 10006), (11, 10001, 10006);
    INSERT INTO season_match_room_players(match_id, player_id, team_side, slot_number)
      SELECT match_id, player_id, CASE WHEN player_id < 10006 THEN 'a' ELSE 'b' END,
        (player_id - 10001) % 5 + 1
      FROM generate_series(10001, 10010) AS player_id CROSS JOIN (VALUES (10), (11)) AS matches(match_id);
    INSERT INTO draft_series(id, season_match_id, player1_id, player2_id, format, status,
      map1_coin_toss_winner_id, updated_at) VALUES
      (1, 10, 10001, 10006, 'BO2', 'DRAFTING', 10001, NOW() - INTERVAL '1 minute'),
      (86, NULL, 10001, 9223372036854775806, 'BO3', 'DRAFTING', 10001, NOW() + INTERVAL '1 minute'),
      (87, 11, 10001, 10006, 'BO2', 'DRAFTING', 10001, NOW() + INTERVAL '2 minutes');
    INSERT INTO draft_maps(id, series_id, map_number, status, first_chooser_id,
      first_pick_player_id, radiant_player_id, step_started_at, preview_hero_id, version)
      VALUES (1, 1, 1, 'DRAFTING', 10001, 10001, 10001, NOW(), 1, 1),
        (86, 86, 1, 'DRAFTING', 10001, 10001, 10001, NOW(), 2, 1),
        (87, 87, 1, 'DRAFTING', 10001, 10001, 10001, NOW(), 3, 1);
    INSERT INTO draft_queue(player_id, heartbeat_at) VALUES (10001, NOW() - INTERVAL '1 hour');
    INSERT INTO draft_invitations(sender_id, recipient_id, format, expires_at)
      VALUES (10001, 10011, 'BO2', NOW() + INTERVAL '1 hour');
  `);
  queries.length = 0;
});

describe("real SQL snapshots keep official lobbies and training separate", () => {
  it("opens the requested official lobby even when a bot training and another official lobby are newer", async () => {
    const official = await loadFearlessDraftSnapshot(captain, { seasonMatchId: 10 });
    expect(official.series?.id).toBe(1);
    expect(official.series?.map.id).toBe(1);
    expect(official.lobbyPlayers).toHaveLength(10);
    const training = await loadFearlessDraftSnapshot(captain);
    expect(training.series?.id).toBe(86);
    expect(training.lobbyPlayers).toBeUndefined();
    expect(training.series?.map.id).toBe(86);
  });

  it("never reads or updates the training queue/invitations from an official screen", async () => {
    const before = await database.query("SELECT player_id, heartbeat_at FROM draft_queue");
    const official = await loadFearlessDraftSnapshot(captain, { seasonMatchId: 10 });
    expect(official).toMatchObject({ isWaiting: false, waitingPlayers: [], invitations: [] });
    expect(queries.some((sql) => /\bdraft_queue\b|\bdraft_invitations\b/.test(sql))).toBe(false);
    expect((await database.query("SELECT player_id, heartbeat_at FROM draft_queue")).rows).toEqual(before.rows);
    expect((await database.query("SELECT status FROM draft_invitations")).rows).toEqual([{ status: "PENDING" }]);
  });

  it("keeps the captain connected independently in both series", async () => {
    await loadFearlessDraftSnapshot(captain, { seasonMatchId: 10 });
    await loadFearlessDraftSnapshot(captain);
    expect((await database.query(`SELECT series_id::int, player_id::text,
      heartbeat_at >= NOW() - INTERVAL '5 seconds' AS fresh FROM draft_presence ORDER BY series_id`)).rows)
      .toEqual([{ series_id: 1, player_id: "10001", fresh: true }, { series_id: 86, player_id: "10001", fresh: true }]);
    const official = await loadFearlessDraftSnapshot(captain, { seasonMatchId: 10 });
    expect(official.series?.player1Connected).toBe(true);
    expect(official.series?.player2Connected).toBe(false);
  });

  it("does not announce captain presence for a teammate and does not expose a lobby to outsiders", async () => {
    const teammate = await loadFearlessDraftSnapshot(viewer("10002"), { seasonMatchId: 10 });
    expect(teammate.series?.id).toBe(1);
    expect((await database.query("SELECT * FROM draft_presence")).rows).toEqual([]);
    queries.length = 0;
    const outsider = await loadFearlessDraftSnapshot(viewer("10011"), { seasonMatchId: 10 });
    expect(outsider.series).toBeNull();
    expect(outsider.lobbyPlayers).toBeUndefined();
    expect(queries.some((sql) => /\bdraft_queue\b|\bdraft_invitations\b/.test(sql))).toBe(false);
  });

  it("exposes only the viewer team's suggestions and hides its captain's highlight from opponents", async () => {
    await database.exec(`INSERT INTO draft_hero_suggestions(map_id, player_id, hero_id)
      VALUES (1, 10002, 2), (1, 10007, 3)`);
    const own = await loadFearlessDraftSnapshot(viewer("10002"), { seasonMatchId: 10 });
    const opponent = await loadFearlessDraftSnapshot(viewer("10007"), { seasonMatchId: 10 });
    expect(own.series?.map.previewHeroId).toBe(1);
    expect(opponent.series?.map.previewHeroId).toBeNull();
    expect(own.series?.map.heroSuggestions.map((suggestion) => suggestion.heroId)).toEqual([2]);
    expect(opponent.series?.map.heroSuggestions.map((suggestion) => suggestion.heroId)).toEqual([3]);
  });
});
