import type { PoolClient } from "pg";
import type { SeasonLobbyRoleHistory } from "./season-lobby-role-policy";

type RoleHistoryRow = {
  player_id: string;
  slot_number: number;
  historical_primary_role: number | null;
};

type CurrentPlayerRole = {
  playerId: string;
  positions: string | null;
};

export async function loadSeasonLobbyRoleHistory(
  client: PoolClient,
  roundId: number,
  players: CurrentPlayerRole[],
): Promise<Map<string, SeasonLobbyRoleHistory>> {
  const currentPrimaryRoles = new Map(
    players.map(({ playerId, positions }) => [
      playerId,
      Number(positions?.split("/")[0]),
    ]),
  );
  const result = await client.query<RoleHistoryRow>(
    `SELECT COALESCE(identity.registered_player_id, participant.player_id)::text
         AS player_id,
       participant.slot_number::int,
       ranked.primary_role::int AS historical_primary_role
     FROM season_rounds target_round
     JOIN season_rounds historical_round
       ON historical_round.tournament_id = target_round.tournament_id
      AND historical_round.round_kind = 'regular'
      AND historical_round.round_number < target_round.round_number
     JOIN season_lobbies lobby ON lobby.round_id = historical_round.id
     JOIN season_matches match ON match.lobby_id = lobby.id
      AND match.status = 'completed'
     JOIN season_match_participants participant ON participant.match_id = match.id
      AND participant.slot_number BETWEEN 1 AND 5
     LEFT JOIN player_identity_members identity_member
       ON identity_member.player_id = participant.player_id
     LEFT JOIN player_identities identity
       ON identity.id = identity_member.identity_id
     LEFT JOIN season_ranked_win_checks ranked
       ON ranked.round_id = historical_round.id
      AND ranked.player_id = participant.player_id
     WHERE target_round.id = $1`,
    [roundId],
  );
  const history = new Map<string, SeasonLobbyRoleHistory>();
  for (const row of result.rows) {
    const currentPrimaryRole = currentPrimaryRoles.get(row.player_id);
    if (!currentPrimaryRole || currentPrimaryRole < 1 || currentPrimaryRole > 5) {
      continue;
    }
    const historicalPrimaryRole = row.historical_primary_role ?? currentPrimaryRole;
    const previous = history.get(row.player_id) ?? {
      completedMatches: 0,
      primaryRoleMatches: 0,
    };
    history.set(row.player_id, {
      completedMatches: previous.completedMatches + 1,
      primaryRoleMatches: previous.primaryRoleMatches +
        Number(row.slot_number === historicalPrimaryRole),
    });
  }
  return history;
}
