import type { PoolClient } from "pg";

export async function resolveSeasonPlayer(
  client: PoolClient,
  rawPlayerId: unknown,
) {
  const playerId = String(rawPlayerId ?? "").trim();
  if (!/^\d{1,20}$/.test(playerId)) {
    throw new Response("Укажите корректный Discord ID или Dota ID игрока", {
      status: 400,
    });
  }
  const result = await client.query<{
    discord_id: string;
    nickname: string;
  }>(
     `SELECT discord_id::text, ingame_name AS nickname
     FROM players
     WHERE is_archived = FALSE
       AND (discord_id::text = $1 OR steam_id32::text = $1)
     ORDER BY (discord_id::text = $1) DESC
     LIMIT 1`,
    [playerId],
  );
  if (!result.rowCount) {
    throw new Response("Игрок с таким ID не найден на сайте", { status: 404 });
  }
  return result.rows[0];
}

export async function addSeasonParticipant(
  client: PoolClient,
  tournamentId: number,
  playerId: string,
) {
  await client.query(
    `INSERT INTO season_participants (tournament_id, player_id)
     VALUES ($1, $2)
     ON CONFLICT (tournament_id, player_id) DO NOTHING`,
    [tournamentId, playerId],
  );
}
