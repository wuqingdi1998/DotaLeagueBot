import type { PoolClient } from "pg";
import { query, transaction } from "@/lib/db";
import { runeChallengeAccessRoleNames } from "@/lib/subscription-roles";
import { runeChallengeTablesForDate } from "../model/rune-challenge-tables";
import { hiddenSubscriptionDiscordIds } from "@/lib/hidden-subscription-entitlements";
import {
  BONUS_QUEST_STAR_THRESHOLD,
} from "../model/constants";
import { CompendiumError } from "../model/errors";
import { dailyQuestExcludedHeroIds } from "../model/daily-quest-exclusions";
import { generateRerollQuestHeroes } from "../model/quests";
import { octoberDailyRerollAllowance } from "@/app/organizer/compendium-october/model/rewards";
import { regularDailyQuestCount } from "./personal-quest-generation";

type RerollAllowanceRow = {
  total_points: number;
  used_count: number;
};

async function rerollsRemainingWithClient(
  client: PoolClient | null,
  dateKey: string,
  playerId: string,
): Promise<number> {
  const statement = `SELECT
       COALESCE(member.total_points, 0)::int AS total_points,
       COUNT(reroll.id)::int AS used_count
     FROM compendium_daily_quest_sets quest_set
     LEFT JOIN compendium_user_quest_rerolls reroll
       ON reroll.quest_set_id = quest_set.id AND reroll.player_id = $2
     LEFT JOIN october_compendium_clan_members member ON member.player_id = $2
     WHERE quest_set.moscow_date = $1::date
     GROUP BY member.total_points`;
  const values = [dateKey, playerId];
  const rows = client
    ? (await client.query<RerollAllowanceRow>(statement, values)).rows
    : await query<RerollAllowanceRow>(statement, values);
  const row = rows[0];
  if (!row) {
    return octoberDailyRerollAllowance(0);
  }
  return Math.max(0, octoberDailyRerollAllowance(row.total_points) - row.used_count);
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
         AND quest.player_id = $3
         AND quest_set.moscow_date = $2::date
         AND quest_set.moscow_date =
           (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date
         AND (
           quest.position <= $5
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
        regularDailyQuestCount(input.dateKey),
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
       JOIN compendium_daily_quests daily_quest
         ON daily_quest.id = hero.daily_quest_id
       WHERE hero.quest_set_id = $1
         AND daily_quest.player_id = $2
       UNION
       SELECT reroll_hero.hero_id
       FROM compendium_user_quest_rerolls reroll
       JOIN compendium_user_quest_reroll_heroes reroll_hero
         ON reroll_hero.reroll_id = reroll.id
       WHERE reroll.quest_set_id = $1 AND reroll.player_id = $2
       UNION
       SELECT selection.hero_id
       FROM ${runeChallengeTablesForDate(input.dateKey).selections} selection
       WHERE selection.player_id = $2
         AND (
           selection.player_id = ANY($5::bigint[])
           OR EXISTS (
             SELECT 1
             FROM player_discord_roles role
             WHERE role.player_id = selection.player_id
               AND role.role_name = ANY($4::text[])
           )
         )
         AND $3::date >
           (selection.selected_at AT TIME ZONE 'Europe/Moscow')::date`,
      [
        quest.rows[0].quest_set_id,
        input.playerId,
        input.dateKey,
        runeChallengeAccessRoleNames,
        hiddenSubscriptionDiscordIds,
      ],
    );
    const replacementHeroes = generateRerollQuestHeroes(
      [
        ...excludedHeroes.rows.map((hero) => hero.hero_id),
        ...dailyQuestExcludedHeroIds(input.dateKey),
      ],
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
