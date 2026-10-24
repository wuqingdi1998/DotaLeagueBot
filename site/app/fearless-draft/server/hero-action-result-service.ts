import type { PoolClient } from "pg";
import type { DraftHeroActionResult } from "../model/hero-action-result";
import type { DraftActionSnapshot } from "../model/snapshot";

type SavedActionRow = {
  series_id: number; series_status: DraftHeroActionResult["seriesStatus"];
  updated_at: Date; server_now: Date; map_id: number;
  map_status: DraftHeroActionResult["map"]["status"];
  current_step: number; version: number; step_started_at: Date | null;
  final_pick_review_ends_at: Date | null;
  player1_reserve_seconds: number; player2_reserve_seconds: number;
  step: number; actor_id: string; action_type: DraftActionSnapshot["type"];
  hero_id: number | null; is_automatic: boolean; created_at: Date;
};

/** Read while the caller still holds the series/map locks for the committed step. */
export async function loadHeroActionResult(
  client: PoolClient, seriesId: number, mapId: number, step: number,
): Promise<DraftHeroActionResult> {
  const saved = await client.query<SavedActionRow>(
    `SELECT series.id::int AS series_id, series.status AS series_status,
       series.updated_at, clock_timestamp() AS server_now,
       map.id::int AS map_id, map.status AS map_status,
       map.current_step::int, map.version::int, map.step_started_at,
       map.final_pick_review_ends_at, map.player1_reserve_seconds::float8,
       map.player2_reserve_seconds::float8, action.step::int,
       action.actor_id::text, action.action_type, action.hero_id::int,
       action.is_automatic, action.created_at
     FROM draft_series series
     JOIN draft_maps map ON map.series_id = series.id AND map.id = $2
     JOIN draft_actions action ON action.map_id = map.id AND action.step = $3
     WHERE series.id = $1`, [seriesId, mapId, step],
  );
  const row = saved.rows[0];
  if (!row) throw new Error("Saved Fearless Draft action receipt is missing");
  return {
    seriesId: row.series_id, seriesStatus: row.series_status,
    seriesUpdatedAt: row.updated_at.toISOString(), serverNow: row.server_now.toISOString(),
    map: {
      id: row.map_id, status: row.map_status, currentStep: row.current_step,
      version: row.version, stepStartedAt: row.step_started_at?.toISOString() ?? null,
      finalPickReviewEndsAt: row.final_pick_review_ends_at?.toISOString() ?? null,
      player1ReserveSeconds: row.player1_reserve_seconds,
      player2ReserveSeconds: row.player2_reserve_seconds,
    },
    action: {
      step: row.step, actorId: row.actor_id, type: row.action_type, heroId: row.hero_id,
      isAutomatic: row.is_automatic, createdAt: row.created_at.toISOString(),
    },
  };
}
