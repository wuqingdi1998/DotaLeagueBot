import { randomInt } from "node:crypto";
import { one, query, transaction } from "@/lib/db";
import { FEARLESS_DRAFT_BOT_PLAYER_ID } from "../model/bot";
import { DRAFT_SEQUENCE } from "../model/config";
import { ENABLED_FEARLESS_DRAFT_HEROES } from "../model/heroes";
import type { DraftChoice, DraftFormat } from "../model/types";
import { markReadyForNextDraftMap, respondToDraftSeriesEnd } from "./agreement-service";
import { hasActiveSeries, lockDraftPlayers } from "./database";
import { DraftRequestError } from "./errors";
import { randomCoinTossResult } from "./coin-toss";
import { makeDraftChoice, selectDraftHero } from "./series-service";

type BotSeriesState = {
  status: string;
  player1_id: string;
  player2_id: string;
  end_requested_by: string | null;
  player1_ready_for_next_map: boolean;
  player2_ready_for_next_map: boolean;
  map_id: number;
  map_status: string;
  first_chooser_id: string;
  first_choice: DraftChoice | null;
  first_pick_player_id: string | null;
  current_step: number;
  version: number;
};

const heroIds = ENABLED_FEARLESS_DRAFT_HEROES.map((hero) => hero.id);
const formats: DraftFormat[] = ["BO2", "BO3"];
type BotDraftMode = "single" | "lobby-preview";

function randomItem<T>(items: readonly T[]): T {
  return items[randomInt(items.length)];
}

async function loadBotSeriesState(playerId: string): Promise<BotSeriesState | null> {
  return one<BotSeriesState>(
    `SELECT series.status, series.player1_id::text, series.player2_id::text,
            series.end_requested_by::text,
            series.player1_ready_for_next_map,
            series.player2_ready_for_next_map,
            map.id::int AS map_id, map.status AS map_status,
            map.first_chooser_id::text, map.first_choice,
            map.first_pick_player_id::text, map.current_step::int,
            map.version::int
     FROM draft_series series
     JOIN draft_maps map
       ON map.series_id = series.id AND map.map_number = series.current_map
     WHERE (series.player1_id = $1 OR series.player2_id = $1)
       AND (series.player1_id = $2 OR series.player2_id = $2)
       AND series.status = ANY($3::text[])
     ORDER BY series.updated_at DESC
     LIMIT 1`,
    [playerId, FEARLESS_DRAFT_BOT_PLAYER_ID, ["CHOOSING", "DRAFTING", "MAP_COMPLETE"]],
  );
}

function secondChooserId(state: BotSeriesState): string {
  return state.first_chooser_id === state.player1_id
    ? state.player2_id
    : state.player1_id;
}

function currentActorId(state: BotSeriesState): string | null {
  if (!state.first_pick_player_id) return null;
  const actor = DRAFT_SEQUENCE[state.current_step]?.actor;
  if (!actor) return null;
  if (actor === "FIRST") return state.first_pick_player_id;
  return state.first_pick_player_id === state.player1_id
    ? state.player2_id
    : state.player1_id;
}

async function runBotAction(action: () => Promise<void>): Promise<boolean> {
  try {
    await action();
    return true;
  } catch (error) {
    if (error instanceof DraftRequestError && error.status === 409) return false;
    throw error;
  }
}

async function randomAvailableHeroId(state: BotSeriesState): Promise<number> {
  const usedRows = await query<{ hero_id: number }>(
    `SELECT action.hero_id::int
     FROM draft_actions action
     JOIN draft_maps map ON map.id = action.map_id
     WHERE map.series_id = (
       SELECT series_id FROM draft_maps WHERE id = $1
     )
       AND action.hero_id IS NOT NULL
       AND (map.id = $1 OR (map.map_number < (
         SELECT map_number FROM draft_maps WHERE id = $1
       ) AND action.action_type = 'PICK'))`,
    [state.map_id],
  );
  const used = new Set(usedRows.map((row) => row.hero_id));
  const available = heroIds.filter((heroId) => !used.has(heroId));
  if (!available.length) throw new DraftRequestError("В пуле не осталось доступных героев", 409);
  return randomItem(available);
}

export async function startBotDraft(
  playerId: string,
  format: DraftFormat = "BO3",
  mode: BotDraftMode = "single",
): Promise<void> {
  if (!formats.includes(format)) throw new DraftRequestError("Некорректный формат");
  await transaction(async (client) => {
    await lockDraftPlayers(client, [playerId, FEARLESS_DRAFT_BOT_PLAYER_ID]);
    if (
      (await hasActiveSeries(client, playerId)) ||
      (await hasActiveSeries(client, FEARLESS_DRAFT_BOT_PLAYER_ID))
    ) {
      throw new DraftRequestError(
        "Сначала завершите активный Fearless Draft или дождитесь освобождения бота",
        409,
      );
    }
    const players = [playerId, FEARLESS_DRAFT_BOT_PLAYER_ID] as const;
    const toss = randomCoinTossResult(players);
    const seriesResult = await client.query<{ id: number }>(
      `INSERT INTO draft_series
        (player1_id, player2_id, format, map1_coin_toss_winner_id,
         is_lobby_preview)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id::int`,
      [
        playerId,
        FEARLESS_DRAFT_BOT_PLAYER_ID,
        format,
        toss.winnerId,
        mode === "lobby-preview",
      ],
    );
    await client.query(
      `INSERT INTO draft_maps
        (series_id, map_number, coin_toss_winner_id, coin_toss_segment, first_chooser_id)
       VALUES ($1, 1, $2, $3, $2)`,
      [seriesResult.rows[0].id, toss.winnerId, toss.segment],
    );
    await client.query("DELETE FROM draft_queue WHERE player_id = $1", [playerId]);
    await client.query(
      `UPDATE draft_invitations SET status = 'CANCELLED', responded_at = NOW()
       WHERE status = 'PENDING' AND (sender_id = $1 OR recipient_id = $1)`,
      [playerId],
    );
  });
  await advanceBotDraft(playerId);
}

export async function advanceBotDraft(playerId: string): Promise<void> {
  for (let attempt = 0; attempt < DRAFT_SEQUENCE.length + 4; attempt += 1) {
    const state = await loadBotSeriesState(playerId);
    if (!state) return;

    if (state.end_requested_by && state.end_requested_by !== FEARLESS_DRAFT_BOT_PLAYER_ID) {
      await runBotAction(() =>
        respondToDraftSeriesEnd(FEARLESS_DRAFT_BOT_PLAYER_ID, "ACCEPT")
      );
      return;
    }
    if (state.status === "MAP_COMPLETE") {
      const botIsPlayer1 = state.player1_id === FEARLESS_DRAFT_BOT_PLAYER_ID;
      const isReady = botIsPlayer1
        ? state.player1_ready_for_next_map
        : state.player2_ready_for_next_map;
      if (!isReady) {
        await runBotAction(() => markReadyForNextDraftMap(FEARLESS_DRAFT_BOT_PLAYER_ID));
        continue;
      }
      return;
    }
    if (state.map_status === "FIRST_DECISION") {
      if (state.first_chooser_id !== FEARLESS_DRAFT_BOT_PLAYER_ID) return;
      await runBotAction(() =>
        makeDraftChoice(FEARLESS_DRAFT_BOT_PLAYER_ID, randomItem([
          "FIRST", "SECOND", "RADIANT", "DIRE",
        ] as const))
      );
      continue;
    }
    if (state.map_status === "SECOND_DECISION") {
      if (secondChooserId(state) !== FEARLESS_DRAFT_BOT_PLAYER_ID) return;
      const choices = state.first_choice === "RADIANT" || state.first_choice === "DIRE"
        ? (["FIRST", "SECOND"] as const)
        : (["RADIANT", "DIRE"] as const);
      await runBotAction(() =>
        makeDraftChoice(FEARLESS_DRAFT_BOT_PLAYER_ID, randomItem(choices))
      );
      continue;
    }
    if (state.map_status !== "DRAFTING" || currentActorId(state) !== FEARLESS_DRAFT_BOT_PLAYER_ID) {
      return;
    }
    const heroId = await randomAvailableHeroId(state);
    await runBotAction(() =>
      selectDraftHero(
        FEARLESS_DRAFT_BOT_PLAYER_ID,
        heroId,
        state.version,
        true,
      )
    );
  }
}
