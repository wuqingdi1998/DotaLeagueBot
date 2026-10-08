import type { PoolClient } from "pg";
import type { MatchingWin } from "../model/types";

export async function queueCompendiumMatchAudits(
  client: PoolClient,
  playerId: string,
  wins: MatchingWin[],
): Promise<void> {
  if (!wins.length) return;
  await client.query(
    `SELECT queue_compendium_match_region_audit($1::bigint, match_id, 'star_race_progress')
     FROM unnest($2::bigint[]) AS match_id`,
    [playerId, [...new Set(wins.map((win) => win.matchId))]],
  );
}
