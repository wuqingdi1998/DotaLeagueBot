import type { PoolClient } from "pg";
import { one, query } from "@/lib/db";
import { DRAFT_TRAINING_INACTIVITY_MINUTES } from "../model/config";
import { DraftRequestError } from "./errors";

/** Validate a locked series without letting automated work extend its lifetime. */
export async function ensureTrainingDraftNotExpired(
  client: PoolClient,
  seriesId: number,
): Promise<void> {
  const result = await client.query(
    `SELECT 1 FROM draft_series
     WHERE id = $1 AND (
       season_match_id IS NOT NULL OR (
         status IN ('CHOOSING', 'DRAFTING', 'MAP_COMPLETE')
         AND last_human_action_at > NOW() - ($2::int * INTERVAL '1 minute')
       )
     )`,
    [seriesId, DRAFT_TRAINING_INACTIVITY_MINUTES],
  );
  if (!result.rowCount) {
    throw new DraftRequestError("Тренировка завершена из-за отсутствия действий", 409);
  }
}

/** Called only for a human action in a standalone draft, inside its transaction. */
export async function touchTrainingDraftActivity(
  client: PoolClient,
  seriesId: number,
): Promise<void> {
  const result = await client.query(
    `UPDATE draft_series SET last_human_action_at = NOW()
     WHERE id = $1 AND season_match_id IS NULL
       AND status IN ('CHOOSING', 'DRAFTING', 'MAP_COMPLETE')
       AND last_human_action_at > NOW() - ($2::int * INTERVAL '1 minute')`,
    [seriesId, DRAFT_TRAINING_INACTIVITY_MINUTES],
  );
  if (!result.rowCount) {
    throw new DraftRequestError(
      "Тренировка завершена из-за отсутствия действий. Начните новую тренировку",
      409,
    );
  }
}

/** Persistent inactivity is independent of bot moves, presence and open tabs. */
export async function expireInactiveTrainingDrafts(): Promise<number[]> {
  const expired = await query<{ id: number }>(
    `UPDATE draft_series
     SET status = 'ABANDONED', end_requested_by = NULL, end_requested_at = NULL,
         player1_ready_for_next_map = FALSE, player2_ready_for_next_map = FALSE,
         updated_at = NOW()
     WHERE season_match_id IS NULL
       AND status IN ('CHOOSING', 'DRAFTING', 'MAP_COMPLETE')
       AND last_human_action_at <= NOW() - ($1::int * INTERVAL '1 minute')
     RETURNING id::int`,
    [DRAFT_TRAINING_INACTIVITY_MINUTES],
  );
  return expired.map((row) => row.id);
}

export async function nextTrainingDraftExpiryAt(): Promise<Date | null> {
  const result = await one<{ deadline: Date | null }>(
    `SELECT MIN(last_human_action_at + ($1::int * INTERVAL '1 minute')) AS deadline
     FROM draft_series
     WHERE season_match_id IS NULL
       AND status IN ('CHOOSING', 'DRAFTING', 'MAP_COMPLETE')`,
    [DRAFT_TRAINING_INACTIVITY_MINUTES],
  );
  return result?.deadline ?? null;
}
