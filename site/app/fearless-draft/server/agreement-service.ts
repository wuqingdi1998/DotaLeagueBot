import { query, transaction } from "@/lib/db";
import {
  canRespondToDraftEndRequest,
  draftEndRequestExpiresAt,
  markNextMapReady,
} from "../model/agreement";
import { DRAFT_END_REQUEST_TTL_MINUTES } from "../model/config";
import { draftSeriesMapCount, firstChooserForMap } from "../model/series";
import { loadLockedDraftSeries } from "./database";
import { databaseNow } from "./database-clock";
import { randomCoinTossResult } from "./coin-toss";
import { DraftRequestError } from "./errors";

export async function settleExpiredDraftEndRequests(): Promise<void> {
  await query(
    `UPDATE draft_series
     SET status = 'ABANDONED', end_requested_by = NULL,
         end_requested_at = NULL, updated_at = NOW()
     WHERE status = ANY($1::text[])
       AND end_requested_by IS NOT NULL
       AND end_requested_at <= NOW() - ($2::int * INTERVAL '1 minute')`,
    [["CHOOSING", "DRAFTING", "MAP_COMPLETE"], DRAFT_END_REQUEST_TTL_MINUTES],
  );
}

export async function requestDraftSeriesEnd(playerId: string): Promise<void> {
  await transaction(async (client) => {
    const { series } = await loadLockedDraftSeries(client, playerId);
    if (series.end_requested_by) {
      throw new DraftRequestError(
        series.end_requested_by === playerId
          ? "Запрос уже отправлен — дождитесь ответа соперника"
          : "Соперник уже предложил завершить драфт — ответьте на его запрос",
        409,
      );
    }
    await client.query(
      `UPDATE draft_series
       SET end_requested_by = $1, end_requested_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [playerId, series.id],
    );
  });
}

export async function respondToDraftSeriesEnd(
  playerId: string,
  response: "ACCEPT" | "DECLINE",
): Promise<void> {
  await transaction(async (client) => {
    const { series } = await loadLockedDraftSeries(client, playerId);
    if (!series.end_requested_by || !series.end_requested_at) {
      throw new DraftRequestError("Активного запроса на завершение нет", 409);
    }
    if (!canRespondToDraftEndRequest(series.end_requested_by, playerId)) {
      throw new DraftRequestError("Ответить на собственный запрос нельзя", 403);
    }
    const expiresAt = draftEndRequestExpiresAt(series.end_requested_at);
    const now = await databaseNow(client);
    const expired = expiresAt.getTime() <= now.getTime();
    await client.query(
      `UPDATE draft_series
       SET status = CASE WHEN $1::boolean OR $2 = 'ACCEPT' THEN 'ABANDONED' ELSE status END,
           end_requested_by = NULL, end_requested_at = NULL, updated_at = NOW()
       WHERE id = $3`,
      [expired, response, series.id],
    );
  });
}

export async function cancelDraftSeriesEnd(playerId: string): Promise<void> {
  await transaction(async (client) => {
    const { series } = await loadLockedDraftSeries(client, playerId);
    if (series.end_requested_by !== playerId) {
      throw new DraftRequestError("Отменить запрос может только его автор", 403);
    }
    await client.query(
      `UPDATE draft_series
       SET end_requested_by = NULL, end_requested_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [series.id],
    );
  });
}

export async function markReadyForNextDraftMap(playerId: string): Promise<void> {
  await transaction(async (client) => {
    const { series, map } = await loadLockedDraftSeries(client, playerId);
    if (series.status !== "MAP_COMPLETE" || map.status !== "COMPLETE") {
      throw new DraftRequestError("Текущая карта ещё не завершена", 409);
    }
    const readiness = markNextMapReady({
      player1Id: series.player1_id,
      player2Id: series.player2_id,
      player1Ready: series.player1_ready_for_next_map,
      player2Ready: series.player2_ready_for_next_map,
    }, playerId);
    if (!readiness.shouldAdvance) {
      await client.query(
        `UPDATE draft_series
         SET player1_ready_for_next_map = $1,
             player2_ready_for_next_map = $2, updated_at = NOW()
         WHERE id = $3`,
        [readiness.player1Ready, readiness.player2Ready, series.id],
      );
      return;
    }

    const nextMap = series.current_map + 1;
    if (nextMap > draftSeriesMapCount(series.format)) {
      throw new DraftRequestError("Серия уже завершена", 409);
    }
    const players = [series.player1_id, series.player2_id] as const;
    const coinToss = nextMap === 3
      ? randomCoinTossResult(players)
      : null;
    const firstChooserId = firstChooserForMap({
      mapNumber: nextMap,
      player1Id: series.player1_id,
      player2Id: series.player2_id,
      map1CoinTossWinnerId: series.map1_coin_toss_winner_id,
      currentCoinTossWinnerId: coinToss?.winnerId ?? null,
    });
    await client.query(
      `INSERT INTO draft_maps
        (series_id, map_number, coin_toss_winner_id, coin_toss_segment, first_chooser_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [series.id, nextMap, coinToss?.winnerId ?? null, coinToss?.segment ?? null, firstChooserId],
    );
    await client.query(
      `UPDATE draft_series
       SET current_map = $1, status = 'CHOOSING',
           player1_ready_for_next_map = FALSE,
           player2_ready_for_next_map = FALSE,
           end_requested_by = NULL, end_requested_at = NULL, updated_at = NOW()
       WHERE id = $2`,
      [nextMap, series.id],
    );
  });
}
