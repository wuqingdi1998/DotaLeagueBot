import type { PoolClient } from "pg";
import { query, transaction } from "@/lib/db";
import { runeChallengeAccessRoleNames } from "@/lib/subscription-roles";
import {
  BONUS_QUEST_STAR_THRESHOLD,
  REROLL_REWARD_STAR_THRESHOLD,
} from "../model/constants";
import { CompendiumError } from "../model/errors";
import { generateRerollQuestHeroes } from "../model/quests";
import { dailyRerollsRemainingForProgress } from "../model/rewards";

type RerollAllowanceRow = {
  total_stars: number;
  used_count: number;
  threshold_reached_today: boolean;
  used_before_threshold: number;
};

async function rerollsRemainingWithClient(
  client: PoolClient | null,
  dateKey: string,
  playerId: string,
): Promise<number> {
  const statement = `WITH star_events AS (
       SELECT completion.completed_at AS occurred_at,
         completion.reward_amount::int AS amount,
         completion.id AS event_id,
         0 AS event_kind
       FROM compendium_user_quest_completions completion
       WHERE completion.player_id = $2
       UNION ALL
       SELECT adjustment.created_at,
         adjustment.amount::int,
         adjustment.id,
         1
       FROM compendium_admin_star_adjustments adjustment
       WHERE adjustment.player_id = $2
       UNION ALL
       SELECT reward.awarded_at,
         reward.reward_amount::int,
         reward.match_id,
         2
       FROM compendium_prediction_rewards reward
       WHERE reward.player_id = $2
       UNION ALL
       SELECT completion.completed_at,
         completion.reward_amount::int,
         completion.id,
         3
       FROM compendium_rune_challenge_completions completion
       WHERE completion.player_id = $2
     ), running_totals AS (
       SELECT occurred_at, event_id, event_kind,
         SUM(amount) OVER (
           ORDER BY occurred_at, event_kind, event_id
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
         )::int AS running_total
       FROM star_events
     ), running_with_previous AS (
       SELECT occurred_at, running_total,
         LAG(running_total, 1, 0) OVER (
           ORDER BY occurred_at, event_kind, event_id
         )::int AS previous_total
       FROM running_totals
     ), threshold_reward AS (
       SELECT occurred_at
       FROM running_with_previous
       WHERE previous_total < $3 AND running_total >= $3
       ORDER BY occurred_at DESC
       LIMIT 1
     )
     SELECT
       COALESCE((
         SELECT total_stars
         FROM compendium_player_star_totals player_total
         WHERE player_total.player_id = $2
       ), 0)::int AS total_stars,
       COUNT(reroll.id)::int AS used_count,
       COALESCE(
         (threshold.occurred_at AT TIME ZONE 'Europe/Moscow')::date = $1::date,
         FALSE
       ) AS threshold_reached_today,
       COUNT(reroll.id) FILTER (
         WHERE reroll.used_at < threshold.occurred_at
       )::int AS used_before_threshold
     FROM compendium_daily_quest_sets quest_set
     LEFT JOIN compendium_user_quest_rerolls reroll
       ON reroll.quest_set_id = quest_set.id AND reroll.player_id = $2
     LEFT JOIN threshold_reward threshold ON TRUE
     WHERE quest_set.moscow_date = $1::date
     GROUP BY threshold.occurred_at`;
  const values = [dateKey, playerId, REROLL_REWARD_STAR_THRESHOLD];
  const rows = client
    ? (await client.query<RerollAllowanceRow>(statement, values)).rows
    : await query<RerollAllowanceRow>(statement, values);
  const row = rows[0];
  if (!row) {
    return dailyRerollsRemainingForProgress({
      totalStars: 0,
      usedCount: 0,
      thresholdReachedToday: false,
      usedBeforeThreshold: 0,
    });
  }
  return dailyRerollsRemainingForProgress({
    totalStars: row.total_stars,
    usedCount: row.used_count,
    thresholdReachedToday: row.threshold_reached_today,
    usedBeforeThreshold: row.used_before_threshold,
  });
}

export async function dailyRerollsRemaining(
  dateKey: string,
  playerId: string,
): Promise<number> {
  return rerollsRemainingWithClient(null, dateKey, playerId);
}

export async function recordDailyQuestReroll(input: {
  playerId: string;
  questId: string;
  dateKey: string;
}): Promise<void> {
  await transaction(async (client) => {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`compendium-reroll:${input.playerId}:${input.dateKey}`],
    );
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`compendium-quest-mutation:${input.playerId}:${input.questId}`],
    );
    const quest = await client.query<{
      quest_set_id: string;
      hero_count: number;
    }>(
      `SELECT quest.quest_set_id::text,
         (
           SELECT COUNT(*)::int
           FROM compendium_daily_quest_heroes original_hero
           WHERE original_hero.daily_quest_id = quest.id
         ) AS hero_count
       FROM compendium_daily_quests quest
       JOIN compendium_daily_quest_sets quest_set
         ON quest_set.id = quest.quest_set_id
       WHERE quest.id = $1
         AND quest_set.moscow_date = $2::date
         AND quest_set.moscow_date =
           (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date
         AND (
           quest.position <= 3
           OR COALESCE((
             SELECT total_stars
             FROM compendium_player_star_totals player_total
             WHERE player_total.player_id = $3
           ), 0) >= $4
         )
       FOR SHARE OF quest`,
      [
        input.questId,
        input.dateKey,
        input.playerId,
        BONUS_QUEST_STAR_THRESHOLD,
      ],
    );
    if (!quest.rowCount) {
      throw new CompendiumError("STALE_QUEST", "Задание больше не действует");
    }
    if (
      (await rerollsRemainingWithClient(client, input.dateKey, input.playerId)) < 1
    ) {
      throw new CompendiumError(
        "REROLL_USED",
        "Рероллов на сегодня не осталось",
      );
    }

    const completion = await client.query(
      `SELECT 1 FROM compendium_user_quest_completions
       WHERE player_id = $1 AND daily_quest_id = $2`,
      [input.playerId, input.questId],
    );
    if (completion.rowCount) {
      throw new CompendiumError(
        "QUEST_COMPLETED",
        "Выполненное задание нельзя заменить",
      );
    }

    const excludedHeroes = await client.query<{ hero_id: number }>(
      `SELECT hero.hero_id
       FROM compendium_daily_quest_heroes hero
       WHERE hero.quest_set_id = $1
       UNION
       SELECT reroll_hero.hero_id
       FROM compendium_user_quest_rerolls reroll
       JOIN compendium_user_quest_reroll_heroes reroll_hero
         ON reroll_hero.reroll_id = reroll.id
       WHERE reroll.quest_set_id = $1 AND reroll.player_id = $2
       UNION
       SELECT selection.hero_id
       FROM compendium_rune_challenge_selections selection
       JOIN player_discord_roles role
         ON role.player_id = selection.player_id
        AND role.role_name = ANY($4::text[])
       WHERE selection.player_id = $2
         AND $3::date >
           (selection.selected_at AT TIME ZONE 'Europe/Moscow')::date`,
      [
        quest.rows[0].quest_set_id,
        input.playerId,
        input.dateKey,
        runeChallengeAccessRoleNames,
      ],
    );
    const replacementHeroes = generateRerollQuestHeroes(
      excludedHeroes.rows.map((hero) => hero.hero_id),
      undefined,
      undefined,
      quest.rows[0].hero_count,
    );
    const reroll = await client.query<{ id: string }>(
      `INSERT INTO compendium_user_quest_rerolls
        (player_id, quest_set_id, daily_quest_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [input.playerId, quest.rows[0].quest_set_id, input.questId],
    );
    for (let index = 0; index < replacementHeroes.length; index += 1) {
      await client.query(
        `INSERT INTO compendium_user_quest_reroll_heroes
          (reroll_id, hero_id, position)
         VALUES ($1, $2, $3)`,
        [reroll.rows[0].id, replacementHeroes[index].id, index + 1],
      );
    }
  });
}
