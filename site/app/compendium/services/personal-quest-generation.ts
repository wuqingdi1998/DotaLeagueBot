import type { PoolClient } from "pg";
import { runeChallengeAccessRoleNames } from "../../../lib/subscription-roles";
import {
  BONUS_QUEST_POSITION,
  DAILY_QUEST_COUNT,
  HEROES_PER_QUEST,
} from "../model/constants";
import {
  generateBonusQuestHeroes,
  generateRerollQuestHeroes,
} from "../model/quests";
import { dailyQuestExcludedHeroIds } from "../model/daily-quest-exclusions";

type ExistingQuestRow = {
  player_id: string;
  position: number;
  hero_id: number | null;
};

type LegacyCompletionHeroRow = {
  completion_id: string;
  player_id: string;
  position: number;
  hero_id: number;
  hero_position: number;
};

type RuneHeroRow = {
  player_id: string;
  hero_id: number;
};

type PreservedCompletion = {
  id: string;
  heroes: Array<{ id: number }>;
};

function questPositionKey(playerId: string, position: number): string {
  return `${playerId}:${position}`;
}

function groupPreservedCompletions(
  rows: LegacyCompletionHeroRow[],
): Map<string, PreservedCompletion> {
  const completions = new Map<string, PreservedCompletion>();
  for (const row of rows) {
    const key = questPositionKey(row.player_id, row.position);
    const completion = completions.get(key) ?? {
      id: row.completion_id,
      heroes: [],
    };
    completion.heroes[row.hero_position - 1] = { id: row.hero_id };
    completions.set(key, completion);
  }
  return completions;
}

async function insertPersonalDailyQuest(
  client: PoolClient,
  questSetId: string,
  playerId: string,
  position: number,
  heroes: Array<{ id: number }>,
): Promise<string> {
  const quest = await client.query<{ id: string }>(
    `INSERT INTO compendium_daily_quests
       (quest_set_id, player_id, position)
     VALUES ($1, $2, $3)
     RETURNING id::text`,
    [questSetId, playerId, position],
  );
  const questId = quest.rows[0].id;
  await client.query(
    `INSERT INTO compendium_daily_quest_heroes
       (daily_quest_id, quest_set_id, hero_id, position)
     SELECT $1, $2, hero_id, hero_position::smallint
     FROM unnest($3::smallint[]) WITH ORDINALITY
       AS generated(hero_id, hero_position)`,
    [questId, questSetId, heroes.map((hero) => hero.id)],
  );
  return questId;
}

async function movePreservedCompletion(
  client: PoolClient,
  questId: string,
  completionId: string,
): Promise<void> {
  await client.query(
    `UPDATE compendium_user_quest_completions
     SET daily_quest_id = $1
     WHERE id = $2`,
    [questId, completionId],
  );
}

/** Creates independent cards for active players and carries over today's completed legacy cards. */
export async function ensurePersonalDailyQuests(
  client: PoolClient,
  questSetId: string,
  dateKey: string,
  requestedPlayerId?: string,
  random: () => number = Math.random,
): Promise<void> {
  const players = await client.query<{ player_id: string }>(
    `SELECT discord_id::text AS player_id
     FROM players
     WHERE is_archived = FALSE
       AND ($1::bigint IS NULL OR discord_id = $1::bigint)
     ORDER BY discord_id`,
    [requestedPlayerId ?? null],
  );
  const playerIds = players.rows.map((row) => row.player_id);
  if (!playerIds.length) return;

  const existingResult = await client.query<ExistingQuestRow>(
    `SELECT quest.player_id::text,
       quest.position,
       hero.hero_id
     FROM compendium_daily_quests quest
     LEFT JOIN compendium_daily_quest_heroes hero
       ON hero.daily_quest_id = quest.id
     WHERE quest.quest_set_id = $1
       AND quest.player_id = ANY($2::bigint[])
      ORDER BY quest.player_id, quest.position, hero.position`,
    [questSetId, playerIds],
  );
  const completionResult = await client.query<LegacyCompletionHeroRow>(
    `SELECT completion.id::text AS completion_id,
       completion.player_id::text,
       quest.position,
       hero.hero_id,
       hero.position AS hero_position
     FROM compendium_user_quest_completions completion
     JOIN compendium_daily_quests quest
       ON quest.id = completion.daily_quest_id
     LEFT JOIN LATERAL (
       SELECT reroll.id
       FROM compendium_user_quest_rerolls reroll
       WHERE reroll.daily_quest_id = quest.id
         AND reroll.player_id = completion.player_id
       ORDER BY reroll.used_at DESC, reroll.id DESC
       LIMIT 1
     ) latest_reroll ON TRUE
     JOIN LATERAL (
       SELECT reroll_hero.hero_id, reroll_hero.position
       FROM compendium_user_quest_reroll_heroes reroll_hero
       WHERE reroll_hero.reroll_id = latest_reroll.id
       UNION ALL
       SELECT original_hero.hero_id, original_hero.position
       FROM compendium_daily_quest_heroes original_hero
       WHERE original_hero.daily_quest_id = quest.id
         AND latest_reroll.id IS NULL
     ) hero ON TRUE
     WHERE quest.quest_set_id = $1
       AND quest.player_id IS NULL
       AND completion.player_id = ANY($2::bigint[])
      ORDER BY completion.player_id, quest.position, hero.position`,
    [questSetId, playerIds],
  );
  const runeResult = await client.query<RuneHeroRow>(
    `SELECT selection.player_id::text, selection.hero_id
     FROM compendium_rune_challenge_selections selection
     JOIN player_discord_roles role
       ON role.player_id = selection.player_id
      AND role.role_name = ANY($3::text[])
     WHERE selection.player_id = ANY($2::bigint[])
       AND $1::date >
         (selection.selected_at AT TIME ZONE 'Europe/Moscow')::date`,
    [dateKey, playerIds, runeChallengeAccessRoleNames],
  );

  const positionsByPlayer = new Map<string, Set<number>>();
  const excludedHeroesByPlayer = new Map<string, Set<number>>();
  for (const playerId of playerIds) {
    positionsByPlayer.set(playerId, new Set());
    excludedHeroesByPlayer.set(
      playerId,
      new Set(dailyQuestExcludedHeroIds(dateKey)),
    );
  }
  for (const row of existingResult.rows) {
    positionsByPlayer.get(row.player_id)?.add(row.position);
    if (row.hero_id !== null) {
      excludedHeroesByPlayer.get(row.player_id)?.add(row.hero_id);
    }
  }
  for (const row of runeResult.rows) {
    excludedHeroesByPlayer.get(row.player_id)?.add(row.hero_id);
  }

  const preservedCompletions = groupPreservedCompletions(completionResult.rows);
  for (const playerId of playerIds) {
    const positions = positionsByPlayer.get(playerId) ?? new Set<number>();
    const excludedHeroIds =
      excludedHeroesByPlayer.get(playerId) ?? new Set<number>();
    for (let position = 1; position <= BONUS_QUEST_POSITION; position += 1) {
      preservedCompletions
        .get(questPositionKey(playerId, position))
        ?.heroes.forEach((hero) => excludedHeroIds.add(hero.id));
    }
    for (let position = 1; position <= BONUS_QUEST_POSITION; position += 1) {
      if (positions.has(position)) continue;
      const preserved = preservedCompletions.get(
        questPositionKey(playerId, position),
      );
      const heroes = preserved
        ? preserved.heroes
        : position <= DAILY_QUEST_COUNT
          ? generateRerollQuestHeroes(
              excludedHeroIds,
              undefined,
              random,
              HEROES_PER_QUEST,
            )
          : generateBonusQuestHeroes(excludedHeroIds, undefined, random);
      const questId = await insertPersonalDailyQuest(
        client,
        questSetId,
        playerId,
        position,
        heroes,
      );
      heroes.forEach((hero) => excludedHeroIds.add(hero.id));
      if (preserved) {
        await movePreservedCompletion(client, questId, preserved.id);
      }
    }
  }
}
