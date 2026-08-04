import { query } from "./db";

export type PlayerTournamentMapStatistics = {
  tournamentId: number;
  tournamentName: string;
  maps: number;
  mapWins: number;
};

export type PlayerMapStatistics = {
  maps: number;
  mapWins: number;
  tournaments: PlayerTournamentMapStatistics[];
};

export function mapWinRatePercent(statistics: Pick<PlayerMapStatistics, "maps" | "mapWins">) {
  return statistics.maps > 0
    ? Math.round((statistics.mapWins / statistics.maps) * 100)
    : 0;
}

export function totalPlayerMapStatistics(
  tournaments: PlayerTournamentMapStatistics[],
): Pick<PlayerMapStatistics, "maps" | "mapWins"> {
  return tournaments.reduce(
    (total, tournament) => ({
      maps: total.maps + tournament.maps,
      mapWins: total.mapWins + tournament.mapWins,
    }),
    { maps: 0, mapWins: 0 },
  );
}

type PlayerTournamentMapStatisticsRow = {
  tournament_id: number;
  tournament_name: string;
  maps: number;
  map_wins: number;
};

/**
 * Counts map results once per tournament. Legacy seasonal tables are used only
 * when that season has no detailed regular-round matches for the player.
 */
export async function loadPlayerMapStatistics(
  playerIds: string[],
): Promise<PlayerMapStatistics> {
  const rows = await query<PlayerTournamentMapStatisticsRow>(
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
     ordinary_contributions AS (
       SELECT DISTINCT ON (ordinary_match.id)
         tournament.id AS tournament_id,
         tournament.name AS tournament_name,
         tournament.start_at AS tournament_start_at,
         ordinary_match.team_a_score + ordinary_match.team_b_score AS maps,
         CASE
           WHEN ordinary_match.team_a_application_id = application.application_id
             THEN ordinary_match.team_a_score
           ELSE ordinary_match.team_b_score
         END AS map_wins
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
       ORDER BY ordinary_match.id, application.application_id
     ),
     season_base_contributions AS (
       SELECT DISTINCT
         season_match.id AS match_id,
         participant.team_side,
         tournament.id AS tournament_id,
         tournament.name AS tournament_name,
         tournament.start_at AS tournament_start_at,
         round.round_kind,
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
         substitution.id AS contribution_id,
         tournament.id AS tournament_id,
         tournament.name AS tournament_name,
         tournament.start_at AS tournament_start_at,
         round.round_kind,
         season_match.team_a_score + season_match.team_b_score AS maps,
         CASE substitution.team_side
           WHEN 'a' THEN season_match.team_a_score
           ELSE season_match.team_b_score
         END AS map_wins
       FROM season_match_substitutions substitution
       JOIN season_matches season_match ON season_match.id = substitution.match_id
       JOIN season_lobbies lobby ON lobby.id = season_match.lobby_id
       JOIN season_rounds round ON round.id = lobby.round_id
       JOIN tournaments tournament ON tournament.id = round.tournament_id
       WHERE substitution.incoming_player_id = ANY($1::bigint[])
         AND substitution.game_id IS NULL
         AND season_match.status IN ('published', 'completed')
         AND season_match.result IS NOT NULL
         AND season_match.team_a_score IS NOT NULL
         AND season_match.team_b_score IS NOT NULL
     ),
     season_substitute_map_contributions AS (
       SELECT DISTINCT
         game.id AS contribution_id,
         tournament.id AS tournament_id,
         tournament.name AS tournament_name,
         tournament.start_at AS tournament_start_at,
         round.round_kind,
         1 AS maps,
         CASE
           WHEN game.winner_side = substitution.team_side THEN 1
           ELSE 0
         END AS map_wins
       FROM season_match_substitutions substitution
       JOIN season_matches season_match ON season_match.id = substitution.match_id
       JOIN season_match_games game ON game.id = substitution.game_id
       JOIN season_lobbies lobby ON lobby.id = season_match.lobby_id
       JOIN season_rounds round ON round.id = lobby.round_id
       JOIN tournaments tournament ON tournament.id = round.tournament_id
       WHERE substitution.incoming_player_id = ANY($1::bigint[])
         AND season_match.status IN ('published', 'completed')
         AND season_match.result IS NOT NULL
         AND game.status IN ('published', 'completed')
         AND game.winner_side IS NOT NULL
     ),
     season_replaced_map_adjustments AS (
       SELECT DISTINCT
         game.id AS contribution_id,
         tournament.id AS tournament_id,
         tournament.name AS tournament_name,
         tournament.start_at AS tournament_start_at,
         round.round_kind,
         -1 AS maps,
         CASE
           WHEN game.winner_side = substitution.team_side THEN -1
           ELSE 0
         END AS map_wins
       FROM season_match_substitutions substitution
       JOIN season_matches season_match ON season_match.id = substitution.match_id
       JOIN season_match_games game ON game.id = substitution.game_id
       JOIN season_lobbies lobby ON lobby.id = season_match.lobby_id
       JOIN season_rounds round ON round.id = lobby.round_id
       JOIN tournaments tournament ON tournament.id = round.tournament_id
       WHERE substitution.outgoing_player_id = ANY($1::bigint[])
         AND season_match.status IN ('published', 'completed')
         AND season_match.result IS NOT NULL
         AND game.status IN ('published', 'completed')
         AND game.winner_side IS NOT NULL
     ),
     season_actual_contributions AS (
       SELECT tournament_id, tournament_name, tournament_start_at,
         round_kind, maps, map_wins
       FROM season_base_contributions
       UNION ALL
       SELECT tournament_id, tournament_name, tournament_start_at,
         round_kind, maps, map_wins
       FROM season_substitute_match_contributions
       UNION ALL
       SELECT tournament_id, tournament_name, tournament_start_at,
         round_kind, maps, map_wins
       FROM season_substitute_map_contributions
       UNION ALL
       SELECT tournament_id, tournament_name, tournament_start_at,
         round_kind, maps, map_wins
       FROM season_replaced_map_adjustments
     ),
     season_actual_regular_tournaments AS (
       SELECT DISTINCT tournament_id
       FROM season_actual_contributions
       WHERE round_kind <> 'finals'
     ),
     season_snapshot_contributions AS (
       SELECT
         tournament.id AS tournament_id,
         tournament.name AS tournament_name,
         tournament.start_at AS tournament_start_at,
         COALESCE(
           NULLIF(participant.standings_snapshot->>'playedRounds', '')::int,
           0
         ) * 2 AS maps,
         (
           COALESCE(NULLIF(participant.standings_snapshot->>'wins', '')::int, 0) * 2
           + COALESCE(NULLIF(participant.standings_snapshot->>'draws', '')::int, 0)
         ) AS map_wins
       FROM season_participants participant
       JOIN tournaments tournament ON tournament.id = participant.tournament_id
       WHERE participant.player_id = ANY($1::bigint[])
         AND tournament.tournament_type = 'seasonal'
         AND participant.standings_snapshot IS NOT NULL
         AND NOT EXISTS (
           SELECT 1
           FROM season_actual_regular_tournaments actual
           WHERE actual.tournament_id = participant.tournament_id
         )
     ),
     all_contributions AS (
       SELECT tournament_id, tournament_name, tournament_start_at,
         maps, map_wins
       FROM ordinary_contributions
       UNION ALL
       SELECT tournament_id, tournament_name, tournament_start_at,
         maps, map_wins
       FROM season_actual_contributions
       UNION ALL
       SELECT tournament_id, tournament_name, tournament_start_at,
         maps, map_wins
       FROM season_snapshot_contributions
     )
     SELECT
       tournament_id,
       tournament_name,
       SUM(maps)::int AS maps,
       SUM(map_wins)::int AS map_wins
     FROM all_contributions
     GROUP BY tournament_id, tournament_name, tournament_start_at
     HAVING SUM(maps) > 0
     ORDER BY tournament_start_at DESC, tournament_id DESC`,
    [playerIds],
  );

  const tournaments = rows.map((row) => ({
    tournamentId: row.tournament_id,
    tournamentName: row.tournament_name,
    maps: row.maps,
    mapWins: row.map_wins,
  }));
  const totals = totalPlayerMapStatistics(tournaments);

  return { ...totals, tournaments };
}
