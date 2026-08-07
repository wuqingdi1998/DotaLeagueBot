import type { PoolClient } from "pg";
import { HEROES_PER_QUEST } from "../model/constants";
import { dailyQuestExcludedHeroIds } from "../model/daily-quest-exclusions";
import { generateRerollQuestHeroes } from "../model/quests";

type StoredQuestHero = {
  quest_id: string;
  player_id: string | null;
  hero_id: number;
  hero_position: number;
};

type StoredRerollHero = {
  reroll_id: string;
  player_id: string;
  hero_id: number | null;
  hero_position: number | null;
};

type QuestCard = {
  id: string;
  playerId: string | null;
  heroIds: number[];
  lastPosition: number;
};

type QuestHeroScopes = {
  sharedHeroIds: Set<number>;
  personalHeroIds: Map<string, Set<number>>;
};

const LEGACY_SCOPE = "legacy";

function questScope(playerId: string | null): string {
  return playerId ?? LEGACY_SCOPE;
}

function groupQuestCards(rows: StoredQuestHero[]): QuestCard[] {
  const cards = new Map<string, QuestCard>();
  for (const row of rows) {
    const card = cards.get(row.quest_id) ?? {
      id: row.quest_id,
      playerId: row.player_id ?? null,
      heroIds: [],
      lastPosition: 0,
    };
    card.heroIds.push(row.hero_id);
    card.lastPosition = Math.max(card.lastPosition, row.hero_position);
    cards.set(row.quest_id, card);
  }
  return [...cards.values()];
}

async function addOriginalQuestHeroes(
  client: PoolClient,
  questSetId: string,
  dateKey: string,
  requestedPlayerId?: string,
): Promise<QuestHeroScopes> {
  const result = await client.query<StoredQuestHero>(
    `SELECT quest.id::text AS quest_id,
       quest.player_id::text,
       hero.hero_id,
       hero.position AS hero_position
     FROM compendium_daily_quests quest
     JOIN compendium_daily_quest_heroes hero
       ON hero.daily_quest_id = quest.id
     WHERE quest.quest_set_id = $1
       AND ($2::bigint IS NULL OR quest.player_id IS NULL OR quest.player_id = $2)
     ORDER BY quest.player_id NULLS FIRST, quest.position, hero.position`,
    [questSetId, requestedPlayerId ?? null],
  );
  const excludedByScope = new Map<string, Set<number>>();
  for (const row of result.rows) {
    const scope = questScope(row.player_id ?? null);
    const excluded = excludedByScope.get(scope) ?? new Set<number>(
      dailyQuestExcludedHeroIds(dateKey),
    );
    excluded.add(row.hero_id);
    excludedByScope.set(scope, excluded);
  }
  for (const card of groupQuestCards(result.rows)) {
    const missingHeroCount = HEROES_PER_QUEST - card.heroIds.length;
    if (missingHeroCount <= 0) continue;
    const scope = questScope(card.playerId);
    const excludedHeroIds = excludedByScope.get(scope) ?? new Set<number>(
      dailyQuestExcludedHeroIds(dateKey),
    );
    const additions = generateRerollQuestHeroes(
      excludedHeroIds,
      undefined,
      undefined,
      missingHeroCount,
    );
    for (let index = 0; index < additions.length; index += 1) {
      await client.query(
        `INSERT INTO compendium_daily_quest_heroes
          (daily_quest_id, quest_set_id, hero_id, position)
         VALUES ($1, $2, $3, $4)`,
        [
          card.id,
          questSetId,
          additions[index].id,
          card.lastPosition + index + 1,
        ],
      );
      excludedHeroIds.add(additions[index].id);
    }
    excludedByScope.set(scope, excludedHeroIds);
  }
  const personalHeroIds = new Map<string, Set<number>>();
  for (const [scope, heroIds] of excludedByScope) {
    if (scope !== LEGACY_SCOPE) personalHeroIds.set(scope, heroIds);
  }
  return {
    sharedHeroIds: excludedByScope.get(LEGACY_SCOPE) ?? new Set<number>(
      dailyQuestExcludedHeroIds(dateKey),
    ),
    personalHeroIds,
  };
}

async function addRerollQuestHeroes(
  client: PoolClient,
  questSetId: string,
  originalHeroScopes: QuestHeroScopes,
  requestedPlayerId?: string,
): Promise<void> {
  const result = await client.query<StoredRerollHero>(
    `SELECT reroll.id::text AS reroll_id,
       reroll.player_id::text,
       hero.hero_id,
       hero.position AS hero_position
     FROM compendium_user_quest_rerolls reroll
     LEFT JOIN compendium_user_quest_reroll_heroes hero
       ON hero.reroll_id = reroll.id
     WHERE reroll.quest_set_id = $1
       AND ($2::bigint IS NULL OR reroll.player_id = $2)
     ORDER BY reroll.player_id, reroll.id, hero.position`,
    [questSetId, requestedPlayerId ?? null],
  );
  const cards = new Map<string, QuestCard & { playerId: string }>();
  const excludedByPlayer = new Map<string, Set<number>>();
  for (const row of result.rows) {
    const excluded = excludedByPlayer.get(row.player_id) ?? new Set([
      ...originalHeroScopes.sharedHeroIds,
      ...(originalHeroScopes.personalHeroIds.get(row.player_id) ?? []),
    ]);
    const card = cards.get(row.reroll_id) ?? {
      id: row.reroll_id,
      playerId: row.player_id,
      heroIds: [],
      lastPosition: 0,
    };
    if (row.hero_id !== null && row.hero_position !== null) {
      card.heroIds.push(row.hero_id);
      card.lastPosition = Math.max(card.lastPosition, row.hero_position);
      excluded.add(row.hero_id);
    }
    cards.set(row.reroll_id, card);
    excludedByPlayer.set(row.player_id, excluded);
  }
  for (const card of cards.values()) {
    const missingHeroCount = HEROES_PER_QUEST - card.heroIds.length;
    if (missingHeroCount <= 0) continue;
    const excludedHeroIds = excludedByPlayer.get(card.playerId) ?? new Set([
      ...originalHeroScopes.sharedHeroIds,
      ...(originalHeroScopes.personalHeroIds.get(card.playerId) ?? []),
    ]);
    const additions = generateRerollQuestHeroes(
      excludedHeroIds,
      undefined,
      undefined,
      missingHeroCount,
    );
    for (let index = 0; index < additions.length; index += 1) {
      await client.query(
        `INSERT INTO compendium_user_quest_reroll_heroes
          (reroll_id, hero_id, position)
         VALUES ($1, $2, $3)`,
        [card.id, additions[index].id, card.lastPosition + index + 1],
      );
      excludedHeroIds.add(additions[index].id);
    }
  }
}

/** Adds missing heroes without replacing cards that were already issued today. */
export async function completeExistingQuestCards(
  client: PoolClient,
  questSetId: string,
  dateKey: string,
  requestedPlayerId?: string,
): Promise<void> {
  const originalHeroScopes = await addOriginalQuestHeroes(
    client,
    questSetId,
    dateKey,
    requestedPlayerId,
  );
  await addRerollQuestHeroes(
    client,
    questSetId,
    originalHeroScopes,
    requestedPlayerId,
  );
}
