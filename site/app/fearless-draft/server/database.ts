import type { PoolClient } from "pg";
import type { DraftChoice, DraftFormat } from "../model/types";
import { DraftRequestError } from "./errors";

export type DraftSeriesRow = {
  id: number;
  player1_id: string;
  player2_id: string;
  format: DraftFormat;
  status: string;
  current_map: number;
  map1_coin_toss_winner_id: string;
  end_requested_by: string | null;
  end_requested_at: Date | null;
  player1_ready_for_next_map: boolean;
  player2_ready_for_next_map: boolean;
  season_match_id: number | null;
};

export type DraftMapRow = {
  id: number;
  status: string;
  map_number: number;
  first_chooser_id: string;
  coin_toss_segment: number | null;
  first_choice: DraftChoice | null;
  radiant_player_id: string | null;
  first_pick_player_id: string | null;
  current_step: number;
  step_started_at: Date | null;
  player1_reserve_seconds: number;
  player2_reserve_seconds: number;
  preview_hero_id: number | null;
  version: number;
};

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
  if (!id) throw new DraftRequestError("Активная серия не найдена", 404);
  return id;
}

export async function loadLockedDraftSeries(
  client: PoolClient,
  playerId: string,
): Promise<{ series: DraftSeriesRow; map: DraftMapRow }> {
  const seriesId = await currentSeriesId(client, playerId);
  return loadLockedDraftSeriesById(client, seriesId);
}

export async function loadLockedDraftSeriesById(
  client: PoolClient,
  seriesId: number,
): Promise<{ series: DraftSeriesRow; map: DraftMapRow }> {
  const seriesResult = await client.query<DraftSeriesRow>(
    `SELECT id::int, player1_id::text, player2_id::text, format, status,
            current_map::int, map1_coin_toss_winner_id::text,
            end_requested_by::text, end_requested_at,
            player1_ready_for_next_map, player2_ready_for_next_map,
            season_match_id::int
     FROM draft_series WHERE id = $1 FOR UPDATE`,
    [seriesId],
  );
  const series = seriesResult.rows[0];
  const mapResult = await client.query<DraftMapRow>(
    `SELECT id::int, status, map_number::int, first_chooser_id::text,
            coin_toss_segment::int,
            first_choice, radiant_player_id::text, first_pick_player_id::text,
            current_step::int, step_started_at,
            player1_reserve_seconds::float8, player2_reserve_seconds::float8,
            preview_hero_id::int,
            version::int
     FROM draft_maps
     WHERE series_id = $1 AND map_number = $2
     FOR UPDATE`,
    [series.id, series.current_map],
  );
  const map = mapResult.rows[0];
  if (!map) throw new DraftRequestError("Текущая карта не найдена", 404);
  return { series, map };
}

export function draftOpponentId(
  series: Pick<DraftSeriesRow, "player1_id" | "player2_id">,
  playerId: string,
): string {
  if (playerId === series.player1_id) return series.player2_id;
  if (playerId === series.player2_id) return series.player1_id;
  throw new DraftRequestError("Пользователь не участвует в этой серии", 403);
}
