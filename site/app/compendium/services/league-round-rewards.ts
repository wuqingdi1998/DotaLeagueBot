import type { PoolClient } from "pg";
import { OCTOBER_COMPENDIUM_START_AT, OCTOBER_COMPENDIUM_END_AT } from "@/lib/october-compendium-schedule";
import {
  OCTOBER_LEAGUE_REWARD_STARS,
  OCTOBER_LEAGUE_ROUND_NUMBERS,
} from "@/app/compendium/model/league-rewards";

export async function syncOctoberLeagueMatchStars(
  client: PoolClient,
  seasonMatchId: number,
): Promise<void> {
  const eligibility = await client.query<{ is_eligible: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM season_matches match
       JOIN season_lobbies lobby ON lobby.id = match.lobby_id
       JOIN season_rounds round ON round.id = lobby.round_id
       JOIN tournaments tournament ON tournament.id = round.tournament_id
       WHERE match.id = $1
         AND match.status = 'completed'
         AND tournament.slug = 'league-season-9'
         AND round.round_number = ANY($2::smallint[])
         AND CURRENT_TIMESTAMP >= $3::timestamptz
         AND CURRENT_TIMESTAMP < $4::timestamptz
     ) AS is_eligible`,
    [seasonMatchId, OCTOBER_LEAGUE_ROUND_NUMBERS, OCTOBER_COMPENDIUM_START_AT, OCTOBER_COMPENDIUM_END_AT],
  );
  if (!eligibility.rows[0]?.is_eligible) return;

  await client.query(
    `INSERT INTO compendium_admin_star_adjustments (
       player_id,
       amount,
       administered_by,
       administrator_name,
       is_star_race_eligible,
       season_match_id
     )
     SELECT participant.player_id,
       CASE
         WHEN CASE participant.team_side
           WHEN 'a' THEN match.team_a_score
           ELSE match.team_b_score
         END >= 2 THEN $4::smallint
         WHEN CASE participant.team_side
           WHEN 'a' THEN match.team_a_score
           ELSE match.team_b_score
         END = 1 THEN $3::smallint
         ELSE $2::smallint
       END,
       0,
       'Система · Лига 9',
       FALSE,
       match.id
     FROM season_matches match
     JOIN season_match_room_players participant ON participant.match_id = match.id
     WHERE match.id = $1
       AND match.status = 'completed'
       AND EXISTS (
         SELECT 1 FROM october_compendium_clan_members member
         WHERE member.player_id = participant.player_id
       )
       AND compendium_stars_count_for_player(participant.player_id, NOW())
       AND NOT EXISTS (
         SELECT 1
         FROM player_discord_roles role
         WHERE role.player_id = participant.player_id
           AND role.role_name = 'Массовка'
       )
     ON CONFLICT (player_id, season_match_id)
       WHERE season_match_id IS NOT NULL
     DO UPDATE SET amount = EXCLUDED.amount,
       administered_by = EXCLUDED.administered_by,
       administrator_name = EXCLUDED.administrator_name,
       is_star_race_eligible = FALSE,
       created_at = NOW()`,
    [
      seasonMatchId,
      OCTOBER_LEAGUE_REWARD_STARS.participation,
      OCTOBER_LEAGUE_REWARD_STARS.oneMapWin,
      OCTOBER_LEAGUE_REWARD_STARS.twoMapWins,
    ],
  );
}
