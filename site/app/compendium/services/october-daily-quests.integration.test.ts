import { PGlite } from "@electric-sql/pglite";
import type { PoolClient } from "pg";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db", () => ({ query: mocks.query }));

import { dailyRerollsRemaining } from "./reroll-repository";
import { loadDailyQuests } from "./repository";
import { ensurePersonalDailyQuests } from "./personal-quest-generation";

let db: PGlite;

function clientFor(database: PGlite): PoolClient {
  return {
    query: async (sql: string, values?: unknown[]) => {
      const result = await database.query(sql, values);
      return {
        rows: result.rows,
        rowCount: result.affectedRows || result.rows.length,
      };
    },
  } as PoolClient;
}

describe("October daily quests database flow", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE TABLE players (
        discord_id bigint PRIMARY KEY,
        is_archived boolean NOT NULL DEFAULT false
      );
      CREATE TABLE october_compendium_clan_members (
        player_id bigint PRIMARY KEY,
        total_points integer NOT NULL DEFAULT 0
      );
      CREATE TABLE compendium_daily_quest_sets (
        id bigserial PRIMARY KEY,
        moscow_date date NOT NULL UNIQUE
      );
      CREATE TABLE compendium_daily_quests (
        id bigserial PRIMARY KEY,
        quest_set_id bigint NOT NULL,
        player_id bigint,
        position smallint NOT NULL
      );
      CREATE TABLE compendium_daily_quest_heroes (
        daily_quest_id bigint NOT NULL,
        quest_set_id bigint NOT NULL,
        hero_id smallint NOT NULL,
        position smallint NOT NULL
      );
      CREATE TABLE compendium_user_quest_completions (
        id bigserial PRIMARY KEY,
        player_id bigint NOT NULL,
        daily_quest_id bigint NOT NULL,
        matched_hero_id smallint,
        matched_match_id bigint,
        completed_at timestamptz NOT NULL DEFAULT now(),
        completion_source text NOT NULL DEFAULT 'automatic'
      );
      CREATE TABLE compendium_user_quest_rerolls (
        id bigserial PRIMARY KEY,
        player_id bigint NOT NULL,
        quest_set_id bigint NOT NULL,
        daily_quest_id bigint NOT NULL,
        used_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE compendium_user_quest_reroll_heroes (
        reroll_id bigint NOT NULL,
        hero_id smallint NOT NULL,
        position smallint NOT NULL
      );
      CREATE TABLE compendium_check_rate_limits (
        player_id bigint PRIMARY KEY,
        attempt_count smallint NOT NULL DEFAULT 1
      );
      CREATE TABLE compendium_rune_challenge_selections (
        player_id bigint NOT NULL,
        hero_id smallint NOT NULL,
        selected_at timestamptz NOT NULL
      );
      CREATE TABLE october_compendium_rune_challenge_selections
        (LIKE compendium_rune_challenge_selections INCLUDING ALL);
      CREATE TABLE player_discord_roles (player_id bigint, role_name text);
      CREATE TABLE compendium_player_star_totals (player_id bigint, total_stars integer);
      CREATE TABLE compendium_star_race_quest_completions (
        id bigserial PRIMARY KEY,
        player_id bigint NOT NULL,
        moscow_date date NOT NULL,
        reward_amount smallint NOT NULL
      );
      CREATE TABLE compendium_star_race_quest_wins (
        completion_id bigint NOT NULL,
        player_id bigint NOT NULL,
        position smallint NOT NULL,
        hero_id smallint NOT NULL,
        matched_match_id bigint NOT NULL
      );
      CREATE TABLE compendium_star_race_quest_progress (
        player_id bigint NOT NULL,
        moscow_date date NOT NULL,
        progress_amount bigint NOT NULL,
        PRIMARY KEY (player_id, moscow_date)
      );
      CREATE TABLE compendium_star_race_quest_progress_wins (
        player_id bigint NOT NULL,
        moscow_date date NOT NULL,
        position smallint NOT NULL
      );
      CREATE TABLE compendium_star_race_tiebreak_rolls (
        race_start_at timestamptz NOT NULL,
        player_id bigint NOT NULL
      );
      CREATE TABLE compendium_star_race_standings_snapshots (
        race_start_at timestamptz PRIMARY KEY
      );
      CREATE TABLE compendium_star_race_arcana_checks (
        id bigserial PRIMARY KEY,
        moscow_date date NOT NULL
      );

    `);
    const migration = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "../bot/database/migrations/0163_open_october_daily_compendium.sql",
      ),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(
      fs.readFileSync(
        path.resolve(
          process.cwd(),
          "../bot/database/migrations/0164_open_october_star_race.sql",
        ),
        "utf8",
      ),
    );
    await db.exec(`
      INSERT INTO players(discord_id) VALUES (10001);
      INSERT INTO october_compendium_clan_members(player_id) VALUES (10001);
      INSERT INTO compendium_daily_quest_sets(moscow_date) VALUES ('2026-10-05');
    `);
    mocks.query.mockImplementation(async (sql: string, values?: unknown[]) => {
      const result = await db.query(sql, values);
      return result.rows;
    });
  });

  afterAll(async () => {
    await db.close();
  });

  it("creates two cards and returns the starting shared reroll", async () => {
    await ensurePersonalDailyQuests(
      clientFor(db),
      "1",
      "2026-10-05",
      "10001",
      () => 0.25,
    );

    const quests = await loadDailyQuests("2026-10-05", "10001");
    const rerolls = await dailyRerollsRemaining("2026-10-05", "10001");

    expect(quests).toHaveLength(2);
    expect(quests.every((quest) => quest.heroes.length === 6)).toBe(true);
    expect(rerolls).toBe(1);
  });

  it("keeps the finished TI dates read-only", async () => {
    await expect(
      db.exec(
        "INSERT INTO compendium_daily_quest_sets(moscow_date) VALUES ('2026-08-20')",
      ),
    ).rejects.toThrow("TI 2026 Compendium is finished and permanently read-only");
  });

  it("opens October race storage and adds its reward to clan points", async () => {
    await db.exec(`
      INSERT INTO compendium_star_race_quest_completions
        (player_id, moscow_date, reward_amount)
      VALUES (10001, '2026-10-05', 2)
    `);
    const points = await db.query<{ total_points: number }>(
      "SELECT total_points FROM october_compendium_clan_members WHERE player_id = 10001",
    );
    expect(points.rows[0].total_points).toBe(2);

    await expect(
      db.exec(`
        INSERT INTO compendium_star_race_quest_completions
          (player_id, moscow_date, reward_amount)
        VALUES (10001, '2026-08-20', 2)
      `),
    ).rejects.toThrow("TI 2026 Compendium is finished and permanently read-only");
  });
});
