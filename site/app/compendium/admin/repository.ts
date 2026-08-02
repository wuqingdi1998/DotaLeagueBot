import { query } from "@/lib/db";
import { buildCompendiumAdminParticipants } from "./model";
import type {
  CompendiumAdminParticipant,
  CompendiumAdminSourceRow,
} from "./types";

export async function loadCompendiumAdminParticipants(): Promise<
  CompendiumAdminParticipant[]
> {
  const rows = await query<CompendiumAdminSourceRow>(
    `WITH participants AS (
       SELECT
         player.discord_id,
         player.ingame_name AS player_name,
         player.steam_id32::text AS dota_id,
         COALESCE(
           NULLIF(player.avatar_url, ''),
           NULLIF(latest_session.discord_avatar_url, '')
         ) AS avatar_url,
         COALESCE(star_total.total_stars, 0)::int AS total_stars
       FROM players player
       LEFT JOIN LATERAL (
         SELECT session.discord_avatar_url
         FROM web_sessions session
         WHERE session.discord_id = player.discord_id
           AND session.discord_avatar_url IS NOT NULL
         ORDER BY session.created_at DESC
         LIMIT 1
       ) latest_session ON TRUE
       LEFT JOIN compendium_player_star_totals star_total
         ON star_total.player_id = player.discord_id
       WHERE player.is_archived = FALSE
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
         NULL::text AS administrator_name
       FROM participants participant
       LEFT JOIN compendium_user_quest_completions completion
         ON completion.player_id = participant.discord_id
       LEFT JOIN compendium_daily_quests quest
         ON quest.id = completion.daily_quest_id
       LEFT JOIN compendium_daily_quest_sets quest_set
         ON quest_set.id = quest.quest_set_id
       LEFT JOIN LATERAL (
         SELECT reroll.id
         FROM compendium_user_quest_rerolls reroll
         WHERE reroll.daily_quest_id = quest.id
           AND reroll.player_id = participant.discord_id
         ORDER BY reroll.used_at DESC, reroll.id DESC
         LIMIT 1
       ) latest_reroll ON TRUE
       LEFT JOIN LATERAL (
         SELECT reroll_hero.hero_id, reroll_hero.position
         FROM compendium_user_quest_reroll_heroes reroll_hero
         WHERE reroll_hero.reroll_id = latest_reroll.id
         UNION ALL
         SELECT original_hero.hero_id, original_hero.position
         FROM compendium_daily_quest_heroes original_hero
         WHERE original_hero.daily_quest_id = quest.id
           AND latest_reroll.id IS NULL
       ) quest_hero ON TRUE
       UNION ALL
       SELECT
         participant.discord_id::text,
         participant.player_name,
         participant.dota_id,
         participant.avatar_url,
         participant.total_stars,
         'admin' AS history_kind,
         adjustment.id::text,
         (adjustment.created_at AT TIME ZONE 'Europe/Moscow')::date::text,
         NULL::smallint,
         NULL::smallint,
         NULL::text,
         adjustment.created_at,
         adjustment.amount,
         NULL::smallint,
         NULL::smallint,
         adjustment.administrator_name
       FROM participants participant
       JOIN compendium_admin_star_adjustments adjustment
         ON adjustment.player_id = participant.discord_id
     ) history
     ORDER BY LOWER(player_name), completed_at DESC NULLS LAST,
       quest_position, hero_position`,
  );
  return buildCompendiumAdminParticipants(rows);
}
