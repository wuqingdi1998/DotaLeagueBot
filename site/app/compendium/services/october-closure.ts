import { one } from "@/lib/db";
import { OCTOBER_COMPENDIUM_END_AT } from "@/lib/october-compendium-schedule";
import { OCTOBER_LEAGUE_FINAL_ROUND, OCTOBER_LEAGUE_REWARD_STARS } from "../model/league-rewards";

import type { OctoberCompendiumClosure } from "../model/results";

// Results and rewards are committed by the same match-result transaction.
export async function loadOctoberCompendiumClosure(now = new Date()): Promise<OctoberCompendiumClosure> {
  if (now.getTime() < Date.parse(OCTOBER_COMPENDIUM_END_AT)) return "active";
  const state = await one<{ is_settled: boolean }>(
    `WITH final_round AS (
       SELECT round.* FROM season_rounds round JOIN tournaments tournament ON tournament.id = round.tournament_id
       WHERE tournament.slug = 'league-season-9' AND round.round_number = $1
     ), final_matches AS (
       SELECT match.* FROM season_matches match JOIN season_lobbies lobby ON lobby.id = match.lobby_id
       JOIN final_round round ON round.id = lobby.round_id
     ), expected_rewards AS (
       SELECT participant.player_id, match.id AS match_id,
         CASE WHEN (CASE participant.team_side WHEN 'a' THEN match.team_a_score ELSE match.team_b_score END) >= 2 THEN $4::int
              WHEN (CASE participant.team_side WHEN 'a' THEN match.team_a_score ELSE match.team_b_score END) = 1 THEN $3::int
              ELSE $2::int END AS amount
       FROM final_matches match JOIN season_match_room_players participant ON participant.match_id = match.id
       JOIN october_compendium_clan_members member ON member.player_id = participant.player_id
       WHERE match.status = 'completed'
         AND compendium_stars_count_for_player(participant.player_id, $5::timestamptz - INTERVAL '1 microsecond')
         AND NOT EXISTS (SELECT 1 FROM player_discord_roles role WHERE role.player_id = participant.player_id AND role.role_name = 'Массовка')
     ) SELECT EXISTS (SELECT 1 FROM final_round round WHERE round.status = 'cancelled' OR (
       round.lobby_configuration_status = 'published'
       AND EXISTS (SELECT 1 FROM final_matches)
       AND NOT EXISTS (SELECT 1 FROM season_lobbies lobby WHERE lobby.round_id = round.id
         AND NOT EXISTS (SELECT 1 FROM final_matches match WHERE match.lobby_id = lobby.id))
       AND NOT EXISTS (SELECT 1 FROM final_matches WHERE status <> 'completed')
       AND NOT EXISTS (SELECT 1 FROM expected_rewards expected WHERE NOT EXISTS (
         SELECT 1 FROM compendium_admin_star_adjustments adjustment
         WHERE adjustment.player_id = expected.player_id AND adjustment.season_match_id = expected.match_id
           AND adjustment.amount = expected.amount AND adjustment.is_star_race_eligible = FALSE
       ))
       AND NOT EXISTS (SELECT 1 FROM expected_rewards expected
         JOIN october_compendium_clan_members member ON member.player_id = expected.player_id
         LEFT JOIN compendium_player_star_totals total ON total.player_id = member.player_id
         WHERE member.total_points <> COALESCE(total.total_stars, 0))
     )) AS is_settled`,
    [OCTOBER_LEAGUE_FINAL_ROUND, OCTOBER_LEAGUE_REWARD_STARS.participation,
      OCTOBER_LEAGUE_REWARD_STARS.oneMapWin, OCTOBER_LEAGUE_REWARD_STARS.twoMapWins, OCTOBER_COMPENDIUM_END_AT],
  );
  return state?.is_settled ? "finished" : "settling";
}
