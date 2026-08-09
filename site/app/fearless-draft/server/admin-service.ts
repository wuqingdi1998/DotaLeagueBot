import { query } from "@/lib/db";
import { DraftRequestError } from "./errors";

export async function adminAbandonDraftSeries(seriesId: number): Promise<void> {
  if (!Number.isInteger(seriesId) || seriesId <= 0) {
    throw new DraftRequestError("Серия не найдена", 404);
  }
  const rows = await query<{ id: number }>(
    `UPDATE draft_series
     SET status = 'ABANDONED', updated_at = NOW()
     WHERE id = $1 AND status = ANY($2::text[])
     RETURNING id::int`,
    [seriesId, ["CHOOSING", "DRAFTING", "MAP_COMPLETE"]],
  );
  if (!rows.length) throw new DraftRequestError("Активная серия не найдена", 404);
}
