import type { PoolClient } from "pg";

export const activeSeriesStatuses = [
  "CHOOSING",
  "DRAFTING",
  "MAP_COMPLETE",
] as const;

export async function lockDraftPlayers(
  client: PoolClient,
  playerIds: readonly string[],
): Promise<void> {
  for (const playerId of [...new Set(playerIds)].sort()) {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `fearless-draft:${playerId}`,
    ]);
  }
}

export async function hasActiveSeries(
  client: PoolClient,
  playerId: string,
): Promise<boolean> {
  const result = await client.query(
    `SELECT 1
     FROM draft_series
     WHERE (player1_id = $1 OR player2_id = $1)
       AND status = ANY($2::text[])
     LIMIT 1`,
    [playerId, activeSeriesStatuses],
  );
  return Boolean(result.rowCount);
}

export async function currentSeriesId(
  client: PoolClient,
  playerId: string,
): Promise<number> {
  const result = await client.query<{ id: number }>(
    `SELECT id::int
     FROM draft_series
     WHERE (player1_id = $1 OR player2_id = $1)
       AND status = ANY($2::text[])
     ORDER BY updated_at DESC
     LIMIT 1
     FOR UPDATE`,
    [playerId, activeSeriesStatuses],
  );
  const id = result.rows[0]?.id;
  if (!id) throw new Error("Активная серия не найдена");
  return id;
}
