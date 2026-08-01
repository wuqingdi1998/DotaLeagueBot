import { one } from "./db";

export type PlayerMapStatistics = {
  maps: number;
  mapWins: number;
};

export function mapWinRatePercent(statistics: PlayerMapStatistics) {
  return statistics.maps > 0
    ? Math.round((statistics.mapWins / statistics.maps) * 100)
    : 0;
}

export async function loadPlayerMapStatistics(
  playerIds: string[],
): Promise<PlayerMapStatistics> {
  const statistics = await one<{ maps: number; map_wins: number }>(
    `WITH ordinary_player_applications AS (
       SELECT member.application_id
       FROM tournament_team_members member
       JOIN tournament_team_applications application
         ON application.id = member.application_id
       WHERE member.player_id = ANY($1::bigint[])
         AND member.invitation_status = 'accepted'
         AND application.status = 'approved'

       UNION

       SELECT snapshot.application_id
       FROM tournament_roster_snapshots snapshot
       JOIN tournament_team_applications application
         ON application.id = snapshot.application_id
       WHERE snapshot.player_id = ANY($1::bigint[])
         AND application.status = 'approved'
     ),
     ordinary_statistics AS (
       SELECT
         COALESCE(SUM(
           ordinary_match.team_a_score + ordinary_match.team_b_score
         ), 0)::int AS maps,
         COALESCE(SUM(
           CASE
             WHEN ordinary_match.team_a_application_id = application.application_id
               THEN ordinary_match.team_a_score
             ELSE ordinary_match.team_b_score
           END
         ), 0)::int AS map_wins
       FROM tournament_matches ordinary_match
       JOIN tournaments tournament
         ON tournament.id = ordinary_match.tournament_id
       JOIN ordinary_player_applications application
         ON application.application_id IN (
           ordinary_match.team_a_application_id,
           ordinary_match.team_b_application_id
         )
       WHERE tournament.tournament_type = 'ordinary'
         AND ordinary_match.status = 'finished'
         AND ordinary_match.result_type <> 'cancelled'
         AND ordinary_match.team_a_score IS NOT NULL
         AND ordinary_match.team_b_score IS NOT NULL
     ),
     season_base_contributions AS (
       SELECT DISTINCT
         season_match.id AS match_id,
         participant.team_side,
         season_match.team_a_score + season_match.team_b_score AS maps,
         CASE participant.team_side
           WHEN 'a' THEN season_match.team_a_score
           ELSE season_match.team_b_score
         END AS map_wins
       FROM season_match_participants participant
       JOIN season_matches season_match ON season_match.id = participant.match_id
       JOIN season_lobbies lobby ON lobby.id = season_match.lobby_id
       JOIN season_rounds round ON round.id = lobby.round_id
       JOIN tournaments tournament ON tournament.id = round.tournament_id
       WHERE participant.player_id = ANY($1::bigint[])
         AND tournament.tournament_type = 'seasonal'
         AND season_match.status IN ('published', 'completed')
         AND season_match.result IS NOT NULL
         AND season_match.team_a_score IS NOT NULL
         AND season_match.team_b_score IS NOT NULL
         AND NOT EXISTS (
           SELECT 1
           FROM season_match_substitutions substitution
           WHERE substitution.match_id = season_match.id
             AND substitution.outgoing_player_id = participant.player_id
             AND substitution.game_id IS NULL
         )
     ),
     season_substitute_match_contributions AS (
       SELECT DISTINCT
         substitution.id AS substitution_id,
         substitution.incoming_player_id AS player_id,
         season_match.team_a_score + season_match.team_b_score AS maps,
         CASE substitution.team_side
           WHEN 'a' THEN season_match.team_a_score
           ELSE season_match.team_b_score
         END AS map_wins
       FROM season_match_substitutions substitution
       JOIN season_matches season_match ON season_match.id = substitution.match_id
       WHERE substitution.incoming_player_id = ANY($1::bigint[])
         AND substitution.game_id IS NULL
         AND season_match.status IN ('published', 'completed')
         AND season_match.result IS NOT NULL
         AND season_match.team_a_score IS NOT NULL
         AND season_match.team_b_score IS NOT NULL
     ),
     season_substitute_map_contributions AS (
       SELECT DISTINCT
         game.id AS game_id,
         substitution.incoming_player_id AS player_id,
         1 AS maps,
         CASE
           WHEN game.winner_side = substitution.team_side THEN 1
           ELSE 0
         END AS map_wins
       FROM season_match_substitutions substitution
       JOIN season_matches season_match ON season_match.id = substitution.match_id
       JOIN season_match_games game ON game.id = substitution.game_id
       WHERE substitution.incoming_player_id = ANY($1::bigint[])
         AND season_match.status IN ('published', 'completed')
         AND season_match.result IS NOT NULL
         AND game.status IN ('published', 'completed')
         AND game.winner_side IS NOT NULL
     ),
     season_replaced_map_adjustments AS (
       SELECT DISTINCT
         game.id AS game_id,
         substitution.outgoing_player_id AS player_id,
         -1 AS maps,
         CASE
           WHEN game.winner_side = substitution.team_side THEN -1
           ELSE 0
         END AS map_wins
       FROM season_match_substitutions substitution
       JOIN season_matches season_match ON season_match.id = substitution.match_id
       JOIN season_match_games game ON game.id = substitution.game_id
       WHERE substitution.outgoing_player_id = ANY($1::bigint[])
         AND season_match.status IN ('published', 'completed')
         AND season_match.result IS NOT NULL
         AND game.status IN ('published', 'completed')
         AND game.winner_side IS NOT NULL
     ),
     season_contributions AS (
       SELECT maps, map_wins FROM season_base_contributions
       UNION ALL
       SELECT maps, map_wins FROM season_substitute_match_contributions
       UNION ALL
       SELECT maps, map_wins FROM season_substitute_map_contributions
       UNION ALL
       SELECT maps, map_wins FROM season_replaced_map_adjustments
     ),
     seasonal_statistics AS (
       SELECT
         COALESCE(SUM(maps), 0)::int AS maps,
         COALESCE(SUM(map_wins), 0)::int AS map_wins
       FROM season_contributions
     )
     SELECT
       ordinary_statistics.maps + seasonal_statistics.maps AS maps,
       ordinary_statistics.map_wins + seasonal_statistics.map_wins AS map_wins
     FROM ordinary_statistics
     CROSS JOIN seasonal_statistics`,
    [playerIds],
  );

  return {
    maps: statistics?.maps ?? 0,
    mapWins: statistics?.map_wins ?? 0,
  };
}
