import type { PoolClient } from "pg";

export async function syncSeasonLobbyNotifications(
  client: PoolClient,
  matchId: number,
) {
  await client.query("SELECT sync_season_lobby_notifications($1::bigint)", [
    matchId,
  ]);
}

export async function syncSeasonRoundLobbyNotifications(
  client: PoolClient,
  roundId: number,
) {
  const matches = await client.query<{ id: number }>(
    `SELECT match.id::int
     FROM season_matches match
     JOIN season_lobbies lobby ON lobby.id = match.lobby_id
     WHERE lobby.round_id = $1`,
    [roundId],
  );
  for (const match of matches.rows) {
    await syncSeasonLobbyNotifications(client, match.id);
  }
}

export async function syncSeasonLobbyGroupNotifications(
  client: PoolClient,
  lobbyId: number,
) {
  const matches = await client.query<{ id: number }>(
    "SELECT id::int FROM season_matches WHERE lobby_id = $1",
    [lobbyId],
  );
  for (const match of matches.rows) {
    await syncSeasonLobbyNotifications(client, match.id);
  }
}
