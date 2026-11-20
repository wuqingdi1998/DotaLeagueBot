import type { PoolClient } from "pg";

export async function removeUnstartedSeasonLobbyPlayer(
  client: PoolClient,
  roundId: number,
  playerId: string,
) {
  const result = await client.query<{ is_removed: boolean }>(
    `SELECT remove_unstarted_season_lobby_player($1::bigint, $2::bigint)
       AS is_removed`,
    [roundId, playerId],
  );
  if (!result.rows[0]?.is_removed) {
    throw new Response(
      "Состав начатого или завершённого тура изменяется через замены",
      { status: 409 },
    );
  }
}
