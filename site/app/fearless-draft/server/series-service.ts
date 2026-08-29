import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { transaction } from "@/lib/db";
import { completeDraftAssignments, applyFirstChoice } from "../model/choices";
import { DRAFT_SEQUENCE } from "../model/config";
import { isDraftChoice } from "../model/choices";
import { ENABLED_FEARLESS_DRAFT_HEROES } from "../model/heroes";
import { selectTimedOutPickHero } from "../model/timeout-selection";
import {
  draftOpponentId,
  loadLockedDraftSeries,
  loadLockedDraftSeriesById,
  type DraftMapRow,
  type DraftSeriesRow,
} from "./database";
import { databaseNow } from "./database-clock";
import { DraftRequestError } from "./errors";

const heroIds = new Set(ENABLED_FEARLESS_DRAFT_HEROES.map((hero) => hero.id));

export async function makeDraftChoice(
  playerId: string,
  choice: unknown,
): Promise<void> {
  if (!isDraftChoice(choice)) throw new DraftRequestError("Некорректный выбор");
  await transaction(async (client) => {
    const { series, map } = await loadLockedDraftSeries(client, playerId);
    const secondChooserId = draftOpponentId(series, map.first_chooser_id);
    if (map.status === "FIRST_DECISION") {
      if (playerId !== map.first_chooser_id) {
        throw new DraftRequestError("Первое решение принимает соперник", 403);
      }
      await client.query(
        `UPDATE draft_maps
         SET first_choice = $1, status = 'SECOND_DECISION', version = version + 1
         WHERE id = $2`,
        [choice, map.id],
      );
      return;
    }
    if (map.status !== "SECOND_DECISION" || !map.first_choice) {
      throw new DraftRequestError("Выбор сторон уже завершён", 409);
    }
    if (playerId !== secondChooserId) {
      throw new DraftRequestError("Сейчас решение принимает соперник", 403);
    }
    const partial = applyFirstChoice(
      map.first_chooser_id,
      secondChooserId,
      map.first_choice,
    );
    let assignments;
    try {
      assignments = completeDraftAssignments(partial, choice);
    } catch (error) {
      throw new DraftRequestError(
        error instanceof Error ? error.message : "Некорректный выбор",
      );
    }
    const radiantPlayerId = Object.entries(assignments).find(
      ([, assignment]) => assignment.side === "RADIANT",
    )?.[0];
    const firstPickPlayerId = Object.entries(assignments).find(
      ([, assignment]) => assignment.priority === "FIRST",
    )?.[0];
    await client.query(
      `UPDATE draft_maps
       SET second_choice = $1, radiant_player_id = $2,
           first_pick_player_id = $3, status = 'DRAFTING',
           step_started_at = NOW(), version = version + 1
       WHERE id = $4`,
      [choice, radiantPlayerId, firstPickPlayerId, map.id],
    );
    await client.query(
      `UPDATE draft_series SET status = 'DRAFTING', updated_at = NOW() WHERE id = $1`,
      [series.id],
    );
  });
}

async function unavailableHeroIds(
  client: PoolClient,
  seriesId: number,
  mapNumber: number,
): Promise<Set<number>> {
  const result = await client.query<{ hero_id: number }>(
    `SELECT action.hero_id::int
     FROM draft_actions action
     JOIN draft_maps map ON map.id = action.map_id
     WHERE map.series_id = $1 AND map.map_number < $2
       AND action.action_type = 'PICK' AND action.hero_id IS NOT NULL`,
    [seriesId, mapNumber],
  );
  return new Set(result.rows.map((row) => row.hero_id));
}

async function currentMapHeroIds(
  client: PoolClient,
  mapId: number,
): Promise<Set<number>> {
  const result = await client.query<{ hero_id: number }>(
    `SELECT hero_id::int FROM draft_actions
     WHERE map_id = $1 AND hero_id IS NOT NULL`,
    [mapId],
  );
  return new Set(result.rows.map((row) => row.hero_id));
}

function actorIdForStep(
  series: DraftSeriesRow,
  map: DraftMapRow,
  stepIndex: number,
): string {
  if (!map.first_pick_player_id) throw new DraftRequestError("Очередность пиков не определена", 409);
  const actor = DRAFT_SEQUENCE[stepIndex]?.actor;
  if (!actor) throw new DraftRequestError("Драфт уже завершён", 409);
  return actor === "FIRST"
    ? map.first_pick_player_id
    : draftOpponentId(series, map.first_pick_player_id);
}

function reserveForActor(
  series: DraftSeriesRow,
  map: DraftMapRow,
  actorId: string,
): number {
  return actorId === series.player1_id
    ? map.player1_reserve_seconds
    : map.player2_reserve_seconds;
}

function timerUsage(map: DraftMapRow, reserveSeconds: number, now: Date) {
  if (!map.step_started_at) throw new DraftRequestError("Таймер хода не запущен", 409);
  const step = DRAFT_SEQUENCE[map.current_step];
  const elapsed = Math.max(0, (now.getTime() - map.step_started_at.getTime()) / 1000);
  const reserveUsed = Math.min(
    reserveSeconds,
    Math.max(0, elapsed - step.baseDurationSeconds),
  );
  return {
    reserveRemaining: Math.max(0, reserveSeconds - reserveUsed),
    isExpired: elapsed >= step.baseDurationSeconds + reserveSeconds,
  };
}

async function commitHeroAction(
  client: PoolClient,
  series: DraftSeriesRow,
  map: DraftMapRow,
  heroId: number | null,
  isAutomatic: boolean,
  now: Date,
): Promise<void> {
  const step = DRAFT_SEQUENCE[map.current_step];
  const actorId = actorIdForStep(series, map, map.current_step);
  const reserve = reserveForActor(series, map, actorId);
  const timer = timerUsage(map, reserve, now);
  await client.query(
    `INSERT INTO draft_actions
      (map_id, step, actor_id, action_type, hero_id, is_automatic)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [map.id, map.current_step, actorId, step.type, heroId, isAutomatic],
  );
  if (heroId !== null) {
    await client.query(
      "DELETE FROM draft_hero_suggestions WHERE map_id = $1 AND hero_id = $2",
      [map.id, heroId],
    );
  }
  const nextStep = map.current_step + 1;
  const reserveColumn = actorId === series.player1_id
    ? "player1_reserve_seconds"
    : "player2_reserve_seconds";
  if (nextStep === DRAFT_SEQUENCE.length) {
    await client.query(
      `UPDATE draft_maps
       SET current_step = $1, ${reserveColumn} = $2, status = 'COMPLETE',
           preview_hero_id = NULL, completed_at = $3, version = version + 1
       WHERE id = $4`,
      [nextStep, timer.reserveRemaining, now, map.id],
    );
    const isSeriesComplete =
      (series.format === "BO2" && map.map_number === 2) ||
      (series.format === "BO3" && map.map_number === 3);
    await client.query(
      `UPDATE draft_series
       SET status = $1, updated_at = $2 WHERE id = $3`,
      [isSeriesComplete ? "COMPLETE" : "MAP_COMPLETE", now, series.id],
    );
  } else {
    await client.query(
      `UPDATE draft_maps
       SET current_step = $1, ${reserveColumn} = $2,
           preview_hero_id = NULL, step_started_at = $3, version = version + 1
       WHERE id = $4`,
      [nextStep, timer.reserveRemaining, now, map.id],
    );
    await client.query(
      "UPDATE draft_series SET updated_at = $1 WHERE id = $2",
      [now, series.id],
    );
  }
}

async function resolveExpiredStep(
  client: PoolClient,
  series: DraftSeriesRow,
  map: DraftMapRow,
  now: Date,
): Promise<boolean> {
  if (map.status !== "DRAFTING" || map.current_step >= DRAFT_SEQUENCE.length) return false;
  const actorId = actorIdForStep(series, map, map.current_step);
  const timer = timerUsage(map, reserveForActor(series, map, actorId), now);
  if (!timer.isExpired) return false;
  const step = DRAFT_SEQUENCE[map.current_step];
  let heroId: number | null = null;
  if (step.type === "PICK") {
    const unavailable = await unavailableHeroIds(client, series.id, map.map_number);
    const used = await currentMapHeroIds(client, map.id);
    const available = [...heroIds].filter((id) => !unavailable.has(id) && !used.has(id));
    if (!available.length) throw new DraftRequestError("В пуле не осталось доступных героев", 409);
    heroId = selectTimedOutPickHero(
      available,
      map.preview_hero_id,
      randomInt(available.length),
    ) ?? null;
  }
  await commitHeroAction(client, series, map, heroId, true, now);
  return true;
}

function validateHeroCommand(heroId: number, expectedVersion: number): void {
  if (!Number.isInteger(heroId) || !heroIds.has(heroId)) {
    throw new DraftRequestError("Герой не найден", 404);
  }
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    throw new DraftRequestError("Состояние драфта устарело", 409);
  }
}

async function loadSelectableHeroTurn(
  client: PoolClient,
  playerId: string,
  heroId: number,
  expectedVersion: number,
) {
  const { series, map } = await loadLockedDraftSeries(client, playerId);
  if (map.status !== "DRAFTING" || series.status !== "DRAFTING") {
    throw new DraftRequestError("Сейчас нельзя выбирать героя", 409);
  }
  if (map.version !== expectedVersion) {
    throw new DraftRequestError("Ход уже изменился — экран обновлён", 409);
  }
  const now = await databaseNow(client);
  if (await resolveExpiredStep(client, series, map, now)) {
    throw new DraftRequestError("Время хода уже истекло", 409);
  }
  if (actorIdForStep(series, map, map.current_step) !== playerId) {
    throw new DraftRequestError("Сейчас ход соперника", 403);
  }
  const unavailable = await unavailableHeroIds(client, series.id, map.map_number);
  const used = await currentMapHeroIds(client, map.id);
  if (unavailable.has(heroId)) {
    throw new DraftRequestError("Герой уже использован на предыдущей карте", 409);
  }
  if (used.has(heroId)) {
    throw new DraftRequestError("Герой уже выбран или забанен", 409);
  }
  return { series, map, now };
}

export async function settleExpiredDraft(
  playerId: string,
  seasonMatchId?: number,
): Promise<void> {
  await transaction(async (client) => {
    const active = await client.query<{ id: number }>(
      `SELECT id::int FROM draft_series
       WHERE status = 'DRAFTING'
         AND (
           (player1_id = $1 OR player2_id = $1)
           OR (
             season_match_id = $2
             AND EXISTS (
               SELECT 1 FROM season_match_room_players participant
               WHERE participant.match_id = season_match_id
                 AND participant.player_id = $1
             )
           )
         )
       ORDER BY updated_at DESC LIMIT 1`,
      [playerId, seasonMatchId ?? null],
    );
    if (!active.rows[0]) return;
    const { series, map } = await loadLockedDraftSeriesById(
      client,
      active.rows[0].id,
    );
    const now = await databaseNow(client);
    await resolveExpiredStep(client, series, map, now);
  });
}

export async function highlightDraftHero(
  playerId: string,
  heroId: number,
  expectedVersion: number,
): Promise<void> {
  validateHeroCommand(heroId, expectedVersion);
  await transaction(async (client) => {
    const { map } = await loadSelectableHeroTurn(
      client,
      playerId,
      heroId,
      expectedVersion,
    );
    await client.query(
      "UPDATE draft_maps SET preview_hero_id = $1 WHERE id = $2",
      [heroId, map.id],
    );
  });
}

export async function selectDraftHero(
  playerId: string,
  heroId: number,
  expectedVersion: number,
  isAutomatic = false,
): Promise<void> {
  validateHeroCommand(heroId, expectedVersion);
  await transaction(async (client) => {
    const { series, map, now } = await loadSelectableHeroTurn(
      client,
      playerId,
      heroId,
      expectedVersion,
    );
    await commitHeroAction(client, series, map, heroId, isAutomatic, now);
  });
}

export async function dismissCompletedSeries(playerId: string): Promise<void> {
  await transaction(async (client) => {
    const result = await client.query(
      `UPDATE draft_series
       SET player1_dismissed_at = CASE WHEN player1_id = $1 THEN NOW() ELSE player1_dismissed_at END,
           player2_dismissed_at = CASE WHEN player2_id = $1 THEN NOW() ELSE player2_dismissed_at END
       WHERE (player1_id = $1 OR player2_id = $1) AND status = 'COMPLETE'`,
      [playerId],
    );
    if (!result.rowCount) throw new DraftRequestError("Завершённая серия не найдена", 404);
  });
}
