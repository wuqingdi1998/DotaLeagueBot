import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { transaction } from "@/lib/db";
import { buildBot3Room } from "../model/bot3-room";
import { advanceBot3Captains, answerBot3Captain, startBot3CaptainSelection, type Bot3CaptainState } from "../model/bot3-captains";
import { loadLobbyPreviewPlayersByViewerId } from "./lobby-preview-service";
import { databaseNow } from "./database-clock";
import { DraftRequestError } from "./errors";
import { recordDraftHumanActivity, validateDraftActionTarget, type DraftActionTarget } from "./draft-context";
import { ensureTrainingDraftNotExpired } from "./training-expiry-service";

const random = () => randomInt(1_000_000) / 1_000_000;

export async function createBot3Captains(client: PoolClient, seriesId: number, viewerId: string) {
  const now = await databaseNow(client);
  const roster = await loadLobbyPreviewPlayersByViewerId(client, viewerId, seriesId);
  const room = buildBot3Room(roster, viewerId, seriesId, now.toISOString());
  const state = startBot3CaptainSelection(room, now.getTime(), random);
  await client.query("INSERT INTO draft_bot3_lobbies (series_id, state) VALUES ($1, $2)", [seriesId, JSON.stringify(state)]);
}

export async function loadBot3Room(client: PoolClient, seriesId: number, isOrganizer: boolean, serverNow: string, series?: { currentMap: number; status: string }) {
  const result = await client.query<{ state: Bot3CaptainState }>("SELECT state FROM draft_bot3_lobbies WHERE series_id = $1", [seriesId]);
  const room = result.rows[0]?.state.room;
  return room ? { ...room, serverNow, isOrganizer,
    currentGameNumber: series?.currentMap ?? room.currentGameNumber,
    status: room.status === "drafting" && series?.status === "MAP_COMPLETE" ? "break" as const : room.status,
  } : undefined;
}

export async function processBot3Captains(
  viewerId: string,
  command?: { action: string; value: boolean | string },
  rawTarget?: DraftActionTarget,
): Promise<boolean> {
  const target = rawTarget || command ? validateDraftActionTarget(rawTarget) : undefined;
  if (target?.seasonMatchId) throw new DraftRequestError("Бот3 доступен только в тренировке", 409);
  return transaction(async (client) => {
    const result = await client.query<{ series_id: number; state: Bot3CaptainState }>(
      `SELECT lobby.series_id::int, lobby.state FROM draft_bot3_lobbies lobby
       JOIN draft_series series ON series.id = lobby.series_id
       JOIN draft_maps map ON map.series_id = series.id AND map.map_number = series.current_map
       WHERE (series.player1_id = $1 OR series.player2_id = $1)
         AND series.status = ANY($2::text[])
          AND series.season_match_id IS NULL
          AND ($3::bigint IS NULL OR series.id = $3)
          AND ($4::bigint IS NULL OR map.id = $4)
        ORDER BY series.id DESC LIMIT 1 FOR UPDATE OF series, lobby`,
       [viewerId, ["CHOOSING", "DRAFTING", "MAP_COMPLETE"], target?.seriesId ?? null, target?.mapId ?? null],
    );
    const row = result.rows[0];
    if (!row) {
      if (command) throw new DraftRequestError("Тест Бот3 не найден", 404);
      return false;
    }
    await ensureTrainingDraftNotExpired(client, row.series_id);
    const now = await databaseNow(client);
    let changed = advanceBot3Captains(row.state, now.getTime(), random);
    if (command) {
      await recordDraftHumanActivity(client, { id: row.series_id, season_match_id: null }, viewerId);
      try { answerBot3Captain(row.state, command.action, command.value); }
      catch (error) { throw new DraftRequestError(error instanceof Error ? error.message : "Ответ недоступен", 409); }
      advanceBot3Captains(row.state, now.getTime(), random);
      changed = true;
    }
    if (changed) await client.query("UPDATE draft_bot3_lobbies SET state = $2 WHERE series_id = $1", [row.series_id, JSON.stringify(row.state)]);
    return row.state.room.status !== "drafting";
  });
}
