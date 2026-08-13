import { query } from "@/lib/db";
import { currentMoscowDay } from "../model/time";
import {
  buildCompendiumAdminParticipantSummaries,
  buildCompendiumAdminParticipants,
} from "./model";
import type {
  CompendiumAdminCurrentQuestSourceRow,
  CompendiumAdminParticipantSummary,
  CompendiumAdminParticipantSummaryRow,
  CompendiumAdminSourceRow,
  CompendiumRewardHistory,
} from "./types";

export async function loadCompendiumAdminParticipants(): Promise<
  CompendiumAdminParticipantSummary[]
> {
  const dateKey = currentMoscowDay().dateKey;
  const [rows, currentQuestRows] = await Promise.all([
    query<CompendiumAdminParticipantSummaryRow>(
      `WITH latest_avatars AS (
         SELECT DISTINCT ON (session.discord_id)
           session.discord_id,
           session.discord_avatar_url
         FROM web_sessions session
         WHERE session.discord_avatar_url IS NOT NULL
         ORDER BY session.discord_id, session.created_at DESC
       ), reward_operations AS (
         SELECT completion.player_id FROM compendium_user_quest_completions completion
         UNION ALL
         SELECT adjustment.player_id FROM compendium_admin_star_adjustments adjustment
         UNION ALL
         SELECT reward.player_id FROM compendium_prediction_rewards reward
         UNION ALL
         SELECT completion.player_id FROM compendium_rune_challenge_completions completion
         UNION ALL
         SELECT completion.player_id FROM compendium_star_race_quest_completions completion
       ), reward_counts AS (
         SELECT operation.player_id, COUNT(*)::int AS reward_count
         FROM reward_operations operation
         GROUP BY operation.player_id
       )
       SELECT
         player.discord_id::text AS player_id,
         player.ingame_name AS player_name,
         player.steam_id32::text AS dota_id,
         COALESCE(
           NULLIF(player.avatar_url, ''),
           NULLIF(avatar.discord_avatar_url, '')
         ) AS avatar_url,
         COALESCE(star_total.total_stars, 0)::int AS total_stars,
         COALESCE(reward_count.reward_count, 0)::int AS reward_count
       FROM players player
       LEFT JOIN latest_avatars avatar ON avatar.discord_id = player.discord_id
       LEFT JOIN compendium_player_star_totals star_total
         ON star_total.player_id = player.discord_id
       LEFT JOIN reward_counts reward_count
         ON reward_count.player_id = player.discord_id
       WHERE player.is_archived = FALSE
       ORDER BY total_stars DESC, LOWER(player.ingame_name), player.discord_id`,
    ),
    query<CompendiumAdminCurrentQuestSourceRow>(
      `SELECT
         player.discord_id::text AS player_id,
         quest.id::text AS quest_id,
         quest.position AS quest_position,
         hero.hero_id,
         hero.position AS hero_position
       FROM players player
       JOIN compendium_daily_quest_sets quest_set
         ON quest_set.moscow_date = $1::date
       JOIN compendium_daily_quests quest
         ON quest.quest_set_id = quest_set.id
        AND quest.player_id = player.discord_id
        AND quest.position <= 3
       LEFT JOIN LATERAL (
         SELECT reroll.id
         FROM compendium_user_quest_rerolls reroll
         WHERE reroll.daily_quest_id = quest.id
           AND reroll.player_id = player.discord_id
         ORDER BY reroll.used_at DESC, reroll.id DESC
         LIMIT 1
       ) latest_reroll ON TRUE
       JOIN LATERAL (
         SELECT reroll_hero.hero_id, reroll_hero.position
         FROM compendium_user_quest_reroll_heroes reroll_hero
         WHERE reroll_hero.reroll_id = latest_reroll.id
         UNION ALL
         SELECT original_hero.hero_id, original_hero.position
         FROM compendium_daily_quest_heroes original_hero
         WHERE original_hero.daily_quest_id = quest.id
           AND latest_reroll.id IS NULL
       ) hero ON TRUE
       WHERE player.is_archived = FALSE
       ORDER BY player.discord_id, quest.position, hero.position`,
      [dateKey],
    ),
  ]);
  return buildCompendiumAdminParticipantSummaries(rows, currentQuestRows);
}

export async function loadCompendiumAdminParticipantHistory(
  playerId: string,
): Promise<CompendiumRewardHistory[] | null> {
  const rows = await query<CompendiumAdminSourceRow>(
    `WITH participant AS (
       SELECT
         player.discord_id,
         player.ingame_name AS player_name,
         player.steam_id32::text AS dota_id,
         player.avatar_url,
         COALESCE(star_total.total_stars, 0)::int AS total_stars
       FROM players player
       LEFT JOIN compendium_player_star_totals star_total
         ON star_total.player_id = player.discord_id
       WHERE player.is_archived = FALSE
         AND player.discord_id = $1
     )
     SELECT * FROM (
       SELECT
         participant.discord_id::text AS player_id,
         participant.player_name,
         participant.dota_id,
         participant.avatar_url,
         participant.total_stars,
         CASE WHEN completion.id IS NULL THEN NULL ELSE 'quest' END AS history_kind,
         completion.id::text AS completion_id,
         quest_set.moscow_date::text,
         quest.position AS quest_position,
         completion.matched_hero_id,
         completion.matched_match_id::text,
         completion.completed_at,
         completion.reward_amount,
         quest_hero.hero_id AS quest_hero_id,
         quest_hero.position AS hero_position,
         NULL::text AS administrator_name,
         NULL::text AS team_a_name,
         NULL::text AS team_b_name,
         NULL::text AS predicted_score,
         NULL::text AS actual_score
       FROM participant
       LEFT JOIN compendium_user_quest_completions completion
         ON completion.player_id = participant.discord_id
       LEFT JOIN compendium_daily_quests quest ON quest.id = completion.daily_quest_id
       LEFT JOIN compendium_daily_quest_sets quest_set ON quest_set.id = quest.quest_set_id
       LEFT JOIN LATERAL (
         SELECT reroll.id
         FROM compendium_user_quest_rerolls reroll
         WHERE reroll.daily_quest_id = quest.id
           AND reroll.player_id = participant.discord_id
         ORDER BY reroll.used_at DESC, reroll.id DESC
         LIMIT 1
       ) latest_reroll ON TRUE
       LEFT JOIN LATERAL (
         SELECT hero.hero_id, hero.position
         FROM compendium_user_quest_reroll_heroes hero
         WHERE hero.reroll_id = latest_reroll.id
         UNION ALL
         SELECT hero.hero_id, hero.position
         FROM compendium_daily_quest_heroes hero
         WHERE hero.daily_quest_id = quest.id AND latest_reroll.id IS NULL
       ) quest_hero ON TRUE
       UNION ALL
       SELECT participant.discord_id::text, participant.player_name,
         participant.dota_id, participant.avatar_url, participant.total_stars,
         'admin', adjustment.id::text,
         (adjustment.created_at AT TIME ZONE 'Europe/Moscow')::date::text,
         NULL::smallint, NULL::smallint, NULL::text, adjustment.created_at,
         adjustment.amount, NULL::smallint, NULL::smallint,
         adjustment.administrator_name, NULL::text, NULL::text, NULL::text, NULL::text
       FROM participant
       JOIN compendium_admin_star_adjustments adjustment
         ON adjustment.player_id = participant.discord_id
       UNION ALL
       SELECT participant.discord_id::text, participant.player_name,
         participant.dota_id, participant.avatar_url, participant.total_stars,
         'prediction', reward.match_id::text, prediction_match.moscow_date::text,
         NULL::smallint, NULL::smallint, NULL::text, reward.awarded_at,
         reward.reward_amount, NULL::smallint, NULL::smallint, NULL::text,
         prediction_match.team_a_name, prediction_match.team_b_name,
         pick.predicted_score, prediction_match.actual_score
       FROM participant
       JOIN compendium_prediction_rewards reward ON reward.player_id = participant.discord_id
       JOIN compendium_prediction_picks pick
         ON pick.match_id = reward.match_id AND pick.player_id = reward.player_id
       JOIN compendium_prediction_matches prediction_match ON prediction_match.id = reward.match_id
       UNION ALL
       SELECT participant.discord_id::text, participant.player_name,
         participant.dota_id, participant.avatar_url, participant.total_stars,
         'rune', reward.id::text, reward.moscow_date::text, NULL::smallint,
         reward.hero_id, reward.matched_match_id::text, reward.completed_at,
         reward.reward_amount, reward.hero_id, 1::smallint,
         NULL::text, NULL::text, NULL::text, NULL::text, NULL::text
       FROM participant
       JOIN compendium_rune_challenge_completions reward
         ON reward.player_id = participant.discord_id
       UNION ALL
       SELECT participant.discord_id::text, participant.player_name,
         participant.dota_id, participant.avatar_url, participant.total_stars,
         'star_race', completion.id::text, completion.moscow_date::text,
         win.position, win.hero_id, win.matched_match_id::text,
         completion.completed_at, completion.reward_amount,
         NULL::smallint, NULL::smallint, NULL::text,
         NULL::text, NULL::text, NULL::text, NULL::text
       FROM participant
       JOIN compendium_star_race_quest_completions completion
         ON completion.player_id = participant.discord_id
       JOIN compendium_star_race_quest_wins win ON win.completion_id = completion.id
     ) history
     ORDER BY completed_at DESC NULLS LAST, quest_position, hero_position`,
    [playerId],
  );
  if (rows.length === 0) return null;
  return buildCompendiumAdminParticipants(rows)[0]?.rewards ?? [];
}
