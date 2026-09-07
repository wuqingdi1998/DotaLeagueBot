import type { PoolClient } from "pg";

export async function applyConfiguredSeasonLobbyTeamNames(
  client: PoolClient,
  lobbyIds: number[],
) {
  if (!lobbyIds.length) return;
  await client.query(
    `UPDATE season_matches match
     SET team_a_name = settings.team_a_name,
       team_b_name = settings.team_b_name,
       updated_at = NOW()
     FROM season_lobbies lobby
     JOIN season_rounds round ON round.id = lobby.round_id
     JOIN season_lobby_team_name_settings settings
       ON settings.tournament_id = round.tournament_id
      AND settings.lobby_name = lobby.name
     WHERE match.lobby_id = lobby.id
       AND lobby.id = ANY($1::bigint[])
       AND round.round_kind = 'regular'
       AND (
         match.team_a_name IS DISTINCT FROM settings.team_a_name
         OR match.team_b_name IS DISTINCT FROM settings.team_b_name
       )`,
    [lobbyIds],
  );
}
