import type { PoolClient } from "pg";
import type { DraftChoice, DraftFormat } from "../model/types";
import { DraftRequestError } from "./errors";
import {
  requireDraftContext,
  validateDraftActionTarget,
  type DraftActionTarget,
  type DraftContext,
} from "./draft-context";
import { ensureTrainingDraftNotExpired } from "./training-expiry-service";

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
  context: DraftContext = {},
): Promise<void> {
  for (const playerId of [...new Set(playerIds)].sort()) {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `fearless-draft:${context.seasonMatchId ? "season" : "training"}:${playerId}`,
    ]);
  }
}

export async function hasActiveSeries(
  client: PoolClient,
  playerId: string,
  context: DraftContext = {},
): Promise<boolean> {
  const result = await client.query(
    `SELECT 1
     FROM draft_series
     WHERE (player1_id = $1 OR player2_id = $1)
       AND status = ANY($2::text[])
       AND (season_match_id IS NULL) = ($3::bigint IS NULL)
       AND ($3::bigint IS NULL OR season_match_id IS DISTINCT FROM $3)
       AND NOT EXISTS (
         SELECT 1 FROM season_match_rooms room
         WHERE room.match_id = draft_series.season_match_id
           AND room.status = 'completed'
       )
     LIMIT 1`,
    [playerId, activeSeriesStatuses, context.seasonMatchId ?? null],
  );
  return Boolean(result.rowCount);
}

export async function loadLockedDraftSeries(
  client: PoolClient,
  playerId: string,
  rawTarget: DraftActionTarget,
  allowedStatuses: readonly string[] = activeSeriesStatuses,
): Promise<{ series: DraftSeriesRow; map: DraftMapRow }> {
  const target = validateDraftActionTarget(rawTarget);
  const draft = await loadLockedDraftSeriesById(client, target.seriesId);
  requireDraftContext(draft.series, draft.map, target);
  if (![draft.series.player1_id, draft.series.player2_id].includes(playerId)) {
    throw new DraftRequestError("Пользователь не участвует в этой серии", 403);
  }
  if (!allowedStatuses.includes(draft.series.status)) {
    throw new DraftRequestError("Серия уже завершена", 409);
  }
  if (!draft.series.season_match_id && activeSeriesStatuses.some(
    (status) => status === draft.series.status,
  )) await ensureTrainingDraftNotExpired(client, draft.series.id);
  return draft;
}

export async function loadDraftSeriesForPreview(
  client: PoolClient,
  playerId: string,
  target: DraftActionTarget,
): Promise<{ series: DraftSeriesRow; map: DraftMapRow }> {
  return loadLockedDraftSeries(client, playerId, target);
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
  if (!series) throw new DraftRequestError("Серия не найдена", 404);
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
