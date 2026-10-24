import type { PoolClient } from "pg";
import { FEARLESS_DRAFT_BOT_PLAYER_ID } from "../model/bot";
import { DraftRequestError } from "./errors";
import { touchTrainingDraftActivity } from "./training-expiry-service";

export type DraftContext = { seasonMatchId?: number };
export type DraftActionTarget = DraftContext & { seriesId: number; mapId: number };

export function validateDraftActionTarget(raw: unknown): DraftActionTarget {
  if (!raw || typeof raw !== "object") {
    throw new DraftRequestError("Не указаны серия и карта драфта", 400);
  }
  const value = raw as Partial<DraftActionTarget>;
  if (![value.seriesId, value.mapId].every(
    (id) => typeof id === "number" && Number.isSafeInteger(id) && id > 0,
  ) || (value.seasonMatchId !== undefined && (
    !Number.isSafeInteger(value.seasonMatchId) || value.seasonMatchId <= 0
  ))) {
    throw new DraftRequestError("Некорректные серия или карта драфта", 400);
  }
  return {
    seriesId: value.seriesId as number,
    mapId: value.mapId as number,
    seasonMatchId: value.seasonMatchId,
  };
}

export function requireDraftContext(
  series: { id: number; season_match_id: number | null },
  map: { id: number },
  target: DraftActionTarget,
): void {
  if (series.id !== target.seriesId || map.id !== target.mapId ||
      (series.season_match_id ?? undefined) !== target.seasonMatchId) {
    throw new DraftRequestError("Драфт или карта уже изменились — обновите экран", 409);
  }
}

export async function recordDraftHumanActivity(
  client: PoolClient,
  series: { id: number; season_match_id: number | null },
  playerId: string,
): Promise<void> {
  if (series.season_match_id || playerId === FEARLESS_DRAFT_BOT_PLAYER_ID) return;
  await touchTrainingDraftActivity(client, series.id);
}
