import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE players (discord_id bigint PRIMARY KEY);
    CREATE TABLE season_rounds (id bigint PRIMARY KEY);
    CREATE TABLE season_round_registrations (
      round_id bigint NOT NULL,
      player_id bigint NOT NULL,
      created_at timestamptz NOT NULL,
      PRIMARY KEY (round_id, player_id)
    );
    CREATE TABLE tournament_audit_log (
      id bigserial PRIMARY KEY,
      entity_type text NOT NULL,
      entity_id text,
      details jsonb NOT NULL,
      created_at timestamptz NOT NULL
    );
    CREATE TABLE season_ranked_win_checks (
      player_id bigint PRIMARY KEY REFERENCES players(discord_id) ON DELETE CASCADE,
      primary_role smallint NOT NULL,
      secondary_role smallint NOT NULL,
      primary_wins smallint NOT NULL,
      secondary_wins smallint NOT NULL,
      checked_at timestamptz NOT NULL,
      source text NOT NULL DEFAULT 'stratz'
    );
    INSERT INTO players VALUES (100);
    INSERT INTO season_rounds VALUES (1), (2);
    INSERT INTO season_round_registrations VALUES
      (1, 100, '2026-08-01T10:00:00Z'),
      (2, 100, '2026-08-10T10:00:00Z');
    INSERT INTO season_ranked_win_checks VALUES
      (100, 1, 5, 12, 3, '2026-08-15T10:00:00Z', 'manual');
    INSERT INTO tournament_audit_log
      (entity_type, entity_id, details, created_at) VALUES
      ('season_ranked_wins', '100',
       '{"roundId":1,"source":"manual","checkedAt":"2026-08-15T10:00:00.000Z"}',
       '2026-08-15T10:00:01Z');
  `);
  await db.exec(readFileSync(new URL(
    "../../../bot/database/migrations/0126_scope_ranked_wins_to_round.sql",
    import.meta.url,
  ), "utf8"));
});

afterAll(async () => {
  await db.close();
});

describe("round-scoped ranked win migration", () => {
  it("keeps an existing manual result in the round where it was entered", async () => {
    const result = await db.query<{ round_id: number; source: string }>(
      "SELECT round_id::int, source FROM season_ranked_win_checks",
    );
    expect(result.rows).toEqual([{ round_id: 1, source: "manual" }]);
  });

  it("allows a fresh Stratz result in the next round", async () => {
    await db.exec(`
      INSERT INTO season_ranked_win_checks VALUES
        (100, 1, 5, 15, 4, '2026-09-02T10:00:00Z', 'stratz', 2);
    `);
    const result = await db.query<{ round_id: number; source: string }>(
      "SELECT round_id::int, source FROM season_ranked_win_checks ORDER BY round_id",
    );
    expect(result.rows).toEqual([
      { round_id: 1, source: "manual" },
      { round_id: 2, source: "stratz" },
    ]);
  });
});
