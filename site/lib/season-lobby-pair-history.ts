import type { PoolClient } from "pg";

type PairHistoryRow = {
  first_player_id: string;
  opponent_count: number | string;
  second_player_id: string;
  teammate_count: number | string;
};

export type SeasonLobbyPairHistory = {
  opponentCounts: ReadonlyMap<string, number>;
  teammateCounts: ReadonlyMap<string, number>;
};

export const EMPTY_SEASON_LOBBY_PAIR_HISTORY: SeasonLobbyPairHistory = {
  opponentCounts: new Map(),
  teammateCounts: new Map(),
};

export async function loadSeasonLobbyPairHistory(
  client: PoolClient,
  roundId: number,
): Promise<SeasonLobbyPairHistory> {
  const result = await client.query<PairHistoryRow>(
    `WITH current_round AS (
       SELECT tournament_id, round_number
       FROM season_rounds
       WHERE id = $1
     ), normalized_participants AS (
       SELECT DISTINCT participant.match_id, participant.team_side,
         COALESCE(
           identity.registered_player_id::text,
           participant.player_id::text
         ) AS player_id
       FROM season_match_participants participant
       JOIN season_matches match ON match.id = participant.match_id
         AND match.status = 'completed'
       JOIN season_lobbies lobby ON lobby.id = match.lobby_id
       JOIN season_rounds historical_round ON historical_round.id = lobby.round_id
       CROSS JOIN current_round current
       LEFT JOIN player_identity_members identity_member
         ON identity_member.player_id = participant.player_id
       LEFT JOIN player_identities identity
         ON identity.id = identity_member.identity_id
       WHERE historical_round.tournament_id = current.tournament_id
         AND historical_round.round_kind = 'regular'
         AND historical_round.round_number < current.round_number
     )
     SELECT first_player.player_id AS first_player_id,
       second_player.player_id AS second_player_id,
       COUNT(*) FILTER (
         WHERE first_player.team_side = second_player.team_side
       )::int AS teammate_count,
       COUNT(*) FILTER (
         WHERE first_player.team_side <> second_player.team_side
       )::int AS opponent_count
     FROM normalized_participants first_player
     JOIN normalized_participants second_player
       ON second_player.match_id = first_player.match_id
      AND second_player.player_id > first_player.player_id
     GROUP BY first_player.player_id, second_player.player_id`,
    [roundId],
  );
  const teammateCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();
  for (const row of result.rows) {
    const key = seasonLobbyPairKey(row.first_player_id, row.second_player_id);
    const teammateCount = Number(row.teammate_count);
    const opponentCount = Number(row.opponent_count);
    if (teammateCount > 0) teammateCounts.set(key, teammateCount);
    if (opponentCount > 0) opponentCounts.set(key, opponentCount);
  }
  return { opponentCounts, teammateCounts };
}

export function seasonLobbyPairKey(
  firstPlayerId: string,
  secondPlayerId: string,
) {
  return [firstPlayerId, secondPlayerId].sort().join(":");
}

export function seasonLobbyPairHistoryPenalty(
  leftPlayers: Array<{ playerId: string }>,
  rightPlayers: Array<{ playerId: string }>,
  history: SeasonLobbyPairHistory,
): [number, number] {
  let teammateFrequency = 0;
  let opponentFrequency = 0;
  for (const team of [leftPlayers, rightPlayers]) {
    for (let firstIndex = 0; firstIndex < team.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < team.length; secondIndex += 1) {
        const key = seasonLobbyPairKey(
          team[firstIndex].playerId,
          team[secondIndex].playerId,
        );
        teammateFrequency += history.teammateCounts.get(key) ?? 0;
      }
    }
  }
  for (const leftPlayer of leftPlayers) {
    for (const rightPlayer of rightPlayers) {
      const key = seasonLobbyPairKey(leftPlayer.playerId, rightPlayer.playerId);
      opponentFrequency += history.opponentCounts.get(key) ?? 0;
    }
  }
  return [teammateFrequency, opponentFrequency];
}
