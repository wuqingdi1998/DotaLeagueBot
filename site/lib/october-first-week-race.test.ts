import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import { OCTOBER_COMPENDIUM_WEEKS } from "@/app/compendium/model/october-star-race";
import { isOctoberFirstRaceWeek, OCTOBER_FIRST_WEEK_RACE_RULES } from "@/app/compendium/model/star-race";

it("counts daily challenges, clan outings and race quests only in the first October week", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE FUNCTION compendium_stars_count_for_player(bigint, timestamptz)
        RETURNS boolean LANGUAGE sql AS 'SELECT $1 <> 2';
      CREATE TABLE compendium_daily_quests (id bigint, position int);
      INSERT INTO compendium_daily_quests VALUES (1, 1), (2, 2), (3, 3), (4, 4);
      CREATE TABLE compendium_user_quest_completions
        (player_id bigint, reward_amount int, completed_at timestamptz, daily_quest_id bigint);
      INSERT INTO compendium_user_quest_completions VALUES
        (1, 1, '2026-10-05 00:00+03', 1), (1, 2, '2026-10-06 12:00+03', 2),
        (1, 3, '2026-10-07 12:00+03', 3), (1, 100, '2026-10-07 12:00+03', 4),
        (1, 20, '2026-10-04 23:59:59+03', 1), (1, 30, '2026-10-12 00:00+03', 1),
        (2, 100, '2026-10-07 12:00+03', 1);
      CREATE TABLE compendium_admin_star_adjustments
        (player_id bigint, amount int, created_at timestamptz, is_star_race_eligible boolean);
      INSERT INTO compendium_admin_star_adjustments VALUES
        (1, 100, '2026-10-07 12:00+03', true), (1, 5, '2026-08-12 12:00+03', true);
      CREATE TABLE compendium_prediction_rewards
        (player_id bigint, reward_amount int, awarded_at timestamptz);
      INSERT INTO compendium_prediction_rewards VALUES (1, 100, '2026-10-07 12:00+03');
      CREATE TABLE compendium_star_race_quest_completions
        (player_id bigint, reward_amount int, completed_at timestamptz);
      INSERT INTO compendium_star_race_quest_completions VALUES (1, 4, '2026-10-07 12:00+03');
      CREATE TABLE october_compendium_clan_outing_completions
        (player_id bigint, reward_amount int, completed_at timestamptz);
      INSERT INTO october_compendium_clan_outing_completions VALUES
        (1, 2, '2026-10-11 23:59:59+03'), (1, 200, '2026-10-12 00:00+03');
      CREATE TABLE october_compendium_rune_challenge_completions
        (player_id bigint, reward_amount int, completed_at timestamptz);
      INSERT INTO october_compendium_rune_challenge_completions VALUES (1, 100, '2026-10-07 12:00+03');
    `);
    const migration = readFileSync(new URL(
      "../../bot/database/migrations/0169_october_first_week_race_sources.sql", import.meta.url,
    ), "utf8");
    await db.exec(migration);
    const week = OCTOBER_COMPENDIUM_WEEKS[0];
    const result = await db.query(
      `SELECT player_id, SUM(amount)::int AS stars FROM compendium_star_race_events
       WHERE earned_at >= $1::timestamptz AND earned_at < $2::timestamptz GROUP BY player_id`,
      [week.startsAt, week.endsAt],
    );
    expect(result.rows).toEqual([{ player_id: 1, stars: 12 }]);
    expect((await db.query(`SELECT SUM(amount)::int AS stars FROM compendium_star_race_events
      WHERE earned_at < '2026-10-05 00:00+03'`)).rows).toEqual([{ stars: 25 }]);
    expect((await db.query(`SELECT SUM(amount)::int AS stars FROM compendium_star_race_events
      WHERE earned_at >= '2026-10-12 00:00+03'`)).rows).toEqual([{ stars: 30 }]);
    expect(isOctoberFirstRaceWeek(week)).toBe(true);
    expect(isOctoberFirstRaceWeek(OCTOBER_COMPENDIUM_WEEKS[1])).toBe(false);
    expect(OCTOBER_FIRST_WEEK_RACE_RULES.join(" ")).toContain(week.dateLabel);
  } finally {
    await db.close();
  }
}, 20000);
