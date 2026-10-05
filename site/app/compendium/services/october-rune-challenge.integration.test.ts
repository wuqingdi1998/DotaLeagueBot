import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ one: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/db", () => mocks);
import {
  loadRuneChallengeSelection, saveRuneChallengeSelection, recordRuneChallengeCompletion,
} from "./rune-challenge-repository";

it("starts October empty, saves the player's choice and preserves frozen TI data", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE players (discord_id bigint PRIMARY KEY);
      INSERT INTO players VALUES (100);
      CREATE TABLE player_discord_roles (player_id bigint, role_name text);
      INSERT INTO player_discord_roles VALUES (100, 'Суппортеры');
      CREATE TABLE october_compendium_clan_members (player_id bigint, total_points int);
      INSERT INTO october_compendium_clan_members VALUES (100, 0);
      CREATE TABLE compendium_rune_challenge_selections
        (player_id bigint PRIMARY KEY, hero_id int, selected_at timestamptz);
      INSERT INTO compendium_rune_challenge_selections VALUES (100, 16, '2026-08-10T00:00:00Z');
      CREATE FUNCTION freeze_archive() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'Archive is frozen'; END;
      $$;
      CREATE TRIGGER freeze_ti_2026_compendium BEFORE INSERT OR UPDATE OR DELETE
        ON compendium_rune_challenge_selections FOR EACH STATEMENT EXECUTE FUNCTION freeze_archive();
      CREATE TABLE compendium_user_quest_completions (player_id bigint, reward_amount int, completed_at timestamptz);
      CREATE TABLE compendium_admin_star_adjustments (player_id bigint, amount int, created_at timestamptz);
      CREATE TABLE compendium_prediction_rewards (player_id bigint, reward_amount int, awarded_at timestamptz);
      CREATE TABLE compendium_rune_challenge_completions (player_id bigint, reward_amount int, completed_at timestamptz);
      CREATE TABLE compendium_star_race_quest_completions (player_id bigint, reward_amount int, completed_at timestamptz);
      CREATE TABLE october_compendium_clan_outing_completions (player_id bigint, reward_amount int, completed_at timestamptz);
      CREATE FUNCTION compendium_stars_count_for_player(bigint, timestamptz)
        RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;
    `);
    await db.exec(readFileSync(new URL(
      "../../../../bot/database/migrations/0168_october_rune_challenge.sql", import.meta.url,
    ), "utf8"));
    const client = {
      query: async (sql: string, values: unknown[] = []) => {
        const result = await db.query(sql, values);
        return { rows: result.rows, rowCount: result.affectedRows || result.rows.length };
      },
    };
    mocks.one.mockImplementation(async (sql: string, values: unknown[]) =>
      (await db.query(sql, values)).rows[0] ?? null);
    mocks.transaction.mockImplementation(async (callback) => {
      await db.exec("BEGIN");
      try {
        const result = await callback(client);
        await db.exec("COMMIT");
        return result;
      } catch (error) {
        await db.exec("ROLLBACK");
        throw error;
      }
    });
    expect((await loadRuneChallengeSelection("100", "2026-08-10"))?.heroId).toBe(16);
    expect(await loadRuneChallengeSelection("100", "2026-10-05")).toBeNull();
    const selection = await saveRuneChallengeSelection({ playerId: "100", heroId: 14, dateKey: "2026-10-05" });
    expect(selection.heroId).toBe(14);
    expect(selection.canChangeHero).toBe(false);
    expect((await loadRuneChallengeSelection("100", "2026-10-05"))?.heroId).toBe(14);
    await expect(saveRuneChallengeSelection({ playerId: "100", heroId: 16, dateKey: "2026-10-05" }))
      .rejects.toMatchObject({ code: "RUNE_HERO_LOCKED" });
    const { rows } = await db.query<{ today: string }>(
      "SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date::text AS today",
    );
    await recordRuneChallengeCompletion({
      playerId: "100", dateKey: rows[0].today, heroId: 14, matchId: "123456", rewardStars: 1,
    });
    expect((await db.query("SELECT SUM(amount)::int AS stars FROM compendium_star_events")).rows)
      .toEqual([{ stars: 1 }]);
    expect((await db.query("SELECT total_points FROM october_compendium_clan_members")).rows)
      .toEqual([{ total_points: 1 }]);
    expect((await loadRuneChallengeSelection("100", "2026-08-10"))?.heroId).toBe(16);
    await expect(db.exec("DELETE FROM compendium_rune_challenge_selections"))
      .rejects.toThrow("Archive is frozen");
  } finally {
    await db.close();
    vi.resetAllMocks();
  }
}, 20000);
