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
  is_season_lobby_preview: boolean;
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
  final_pick_review_ends_at: Date | null;
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
  excludeSeasonMatchId?: number,
): Promise<boolean> {
  const result = await client.query(
    `SELECT 1
     FROM draft_series
     WHERE (player1_id = $1 OR player2_id = $1)
       AND status = ANY($2::text[])
       AND ($3::bigint IS NULL OR season_match_id IS DISTINCT FROM $3)
       AND NOT EXISTS (
         SELECT 1 FROM season_match_rooms room
         WHERE room.match_id = draft_series.season_match_id
           AND room.status = 'completed'
       )
     LIMIT 1`,
    [playerId, activeSeriesStatuses, excludeSeasonMatchId ?? null],
  );
  return Boolean(result.rowCount);
}

export async function currentSeriesId(
  client: PoolClient,
  playerId: string,
  opponentId?: string,
): Promise<number> {
  const result = await client.query<{ id: number }>(
    `SELECT id::int
     FROM draft_series
     WHERE (player1_id = $1 OR player2_id = $1)
       AND status = ANY($2::text[])
       AND ($3::bigint IS NULL OR player1_id = $3 OR player2_id = $3)
     ORDER BY updated_at DESC
     LIMIT 1
     FOR UPDATE`,
    [playerId, activeSeriesStatuses, opponentId ?? null],
  );
  const id = result.rows[0]?.id;
  if (!id) throw new DraftRequestError("Активная серия не найдена", 404);
  return id;
}

export async function loadLockedDraftSeries(
  client: PoolClient,
  playerId: string,
  opponentId?: string,
): Promise<{ series: DraftSeriesRow; map: DraftMapRow }> {
  const seriesId = await currentSeriesId(client, playerId, opponentId);
  return loadLockedDraftSeriesById(client, seriesId);
}

export async function loadDraftSeriesForPreview(
  client: PoolClient,
  playerId: string,
): Promise<{ series: DraftSeriesRow; map: DraftMapRow }> {
  const result = await client.query<DraftSeriesRow & DraftMapRow & {
    series_id: number;
    map_id: number;
    series_status: string;
    map_status: string;
  }>(
    `SELECT series.id::int AS series_id,
            series.player1_id::text, series.player2_id::text, series.format,
            series.status AS series_status, series.current_map::int,
            series.map1_coin_toss_winner_id::text,
            series.end_requested_by::text, series.end_requested_at,
            series.player1_ready_for_next_map,
            series.player2_ready_for_next_map,
            series.season_match_id::int, series.is_season_lobby_preview,
            map.id::int AS map_id, map.status AS map_status,
            map.map_number::int, map.first_chooser_id::text,
            map.coin_toss_segment::int, map.first_choice,
            map.radiant_player_id::text, map.first_pick_player_id::text,
            map.current_step::int, map.step_started_at,
            map.final_pick_review_ends_at,
            map.player1_reserve_seconds::float8,
            map.player2_reserve_seconds::float8,
            map.preview_hero_id::int, map.version::int
     FROM draft_series series
     JOIN draft_maps map
       ON map.series_id = series.id AND map.map_number = series.current_map
     WHERE (series.player1_id = $1 OR series.player2_id = $1)
       AND series.status = 'DRAFTING' AND map.status = 'DRAFTING'
     ORDER BY series.updated_at DESC LIMIT 1`,
    [playerId],
  );
  const row = result.rows[0];
  if (!row) throw new DraftRequestError("Активная серия не найдена", 404);
  return {
    series: { ...row, id: row.series_id, status: row.series_status },
    map: { ...row, id: row.map_id, status: row.map_status },
  };
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
            season_match_id::int, is_season_lobby_preview
     FROM draft_series WHERE id = $1 FOR UPDATE`,
    [seriesId],
  );
  const series = seriesResult.rows[0];
  const mapResult = await client.query<DraftMapRow>(
    `SELECT id::int, status, map_number::int, first_chooser_id::text,
            coin_toss_segment::int,
            first_choice, radiant_player_id::text, first_pick_player_id::text,
            current_step::int, step_started_at, final_pick_review_ends_at,
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
