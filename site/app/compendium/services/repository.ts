import type { PoolClient } from "pg";
import { one, query, transaction } from "@/lib/db";
import {
  CHECK_RATE_LIMIT,
  CHECK_RATE_WINDOW_SECONDS,
  QUEST_REWARD_STARS,
} from "../model/constants";
import { CompendiumError } from "../model/errors";
import { compendiumHeroById } from "../model/heroes";
import { generateDailyQuestHeroes } from "../model/quests";
import type { DailyQuest, QuestCompletion } from "../model/types";

type QuestDataRow = {
  quest_id: string;
  position: number;
  hero_id: number;
  completion_hero_id: number | null;
  matched_match_id: string | null;
  completed_at: Date | null;
};

type CompletionRow = {
  matched_hero_id: number;
  matched_match_id: string;
  completed_at: Date;
};

export type QuestForCheck = {
  id: string;
  heroIds: number[];
};

function completionFromRow(row: CompletionRow): QuestCompletion {
  return {
    matchedHeroId: row.matched_hero_id,
    matchedMatchId: row.matched_match_id,
    completedAt: row.completed_at.toISOString(),
  };
}

export async function ensureDailyQuestSet(dateKey: string): Promise<string> {
  return transaction(async (client) => {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`compendium-quest-set:${dateKey}`],
    );
    const existing = await client.query<{ id: string }>(
      `SELECT id::text FROM compendium_daily_quest_sets
       WHERE moscow_date = $1::date`,
      [dateKey],
    );
    if (existing.rowCount) return existing.rows[0].id;

    const created = await client.query<{ id: string }>(
      `INSERT INTO compendium_daily_quest_sets(moscow_date)
       VALUES ($1::date)
       ON CONFLICT (moscow_date) DO UPDATE SET moscow_date = EXCLUDED.moscow_date
       RETURNING id::text`,
      [dateKey],
    );
    const questSetId = created.rows[0].id;
    const dailyHeroes = generateDailyQuestHeroes();
    for (let questIndex = 0; questIndex < dailyHeroes.length; questIndex += 1) {
      const quest = await client.query<{ id: string }>(
        `INSERT INTO compendium_daily_quests(quest_set_id, position)
         VALUES ($1, $2) RETURNING id::text`,
        [questSetId, questIndex + 1],
      );
      for (let heroIndex = 0; heroIndex < dailyHeroes[questIndex].length; heroIndex += 1) {
        await client.query(
          `INSERT INTO compendium_daily_quest_heroes
            (daily_quest_id, quest_set_id, hero_id, position)
           VALUES ($1, $2, $3, $4)`,
          [
            quest.rows[0].id,
            questSetId,
            dailyHeroes[questIndex][heroIndex].id,
            heroIndex + 1,
          ],
        );
      }
    }
    return questSetId;
  });
}

export async function loadDailyQuests(
  dateKey: string,
  playerId: string,
): Promise<DailyQuest[]> {
  const rows = await query<QuestDataRow>(
    `SELECT quest.id::text AS quest_id, quest.position,
       hero.hero_id,
       completion.matched_hero_id AS completion_hero_id,
       completion.matched_match_id::text,
       completion.completed_at
     FROM compendium_daily_quest_sets quest_set
     JOIN compendium_daily_quests quest ON quest.quest_set_id = quest_set.id
     JOIN LATERAL (
       SELECT reroll_hero.hero_id, reroll_hero.position
       FROM compendium_user_quest_rerolls reroll
       JOIN compendium_user_quest_reroll_heroes reroll_hero
         ON reroll_hero.reroll_id = reroll.id
       WHERE reroll.daily_quest_id = quest.id AND reroll.player_id = $2
       UNION ALL
       SELECT original_hero.hero_id, original_hero.position
       FROM compendium_daily_quest_heroes original_hero
       WHERE original_hero.daily_quest_id = quest.id
         AND NOT EXISTS (
           SELECT 1 FROM compendium_user_quest_rerolls reroll
           WHERE reroll.daily_quest_id = quest.id AND reroll.player_id = $2
         )
     ) hero ON TRUE
     LEFT JOIN compendium_user_quest_completions completion
       ON completion.daily_quest_id = quest.id AND completion.player_id = $2
     WHERE quest_set.moscow_date = $1::date
     ORDER BY quest.position, hero.position`,
    [dateKey, playerId],
  );
  const quests = new Map<string, DailyQuest>();
  for (const row of rows) {
    const current = quests.get(row.quest_id) ?? {
      id: row.quest_id,
      position: row.position,
      heroes: [],
      completion: row.completed_at
        ? {
            matchedHeroId: Number(row.completion_hero_id),
            matchedMatchId: String(row.matched_match_id),
            completedAt: row.completed_at.toISOString(),
          }
        : null,
    };
    current.heroes.push(compendiumHeroById(row.hero_id));
    quests.set(row.quest_id, current);
  }
  return [...quests.values()];
}

export async function totalCompendiumStars(playerId: string): Promise<number> {
  const row = await one<{ total: number }>(
    `SELECT COALESCE(SUM(reward_amount), 0)::int AS total
     FROM compendium_user_quest_completions WHERE player_id = $1`,
    [playerId],
  );
  return row?.total ?? 0;
}

export async function questForCurrentDay(
  questId: string,
  dateKey: string,
  playerId: string,
): Promise<QuestForCheck | null> {
  const rows = await query<{ id: string; hero_id: number }>(
    `SELECT quest.id::text, hero.hero_id
     FROM compendium_daily_quests quest
     JOIN compendium_daily_quest_sets quest_set ON quest_set.id = quest.quest_set_id
     JOIN LATERAL (
       SELECT reroll_hero.hero_id, reroll_hero.position
       FROM compendium_user_quest_rerolls reroll
       JOIN compendium_user_quest_reroll_heroes reroll_hero
         ON reroll_hero.reroll_id = reroll.id
       WHERE reroll.daily_quest_id = quest.id AND reroll.player_id = $3
       UNION ALL
       SELECT original_hero.hero_id, original_hero.position
       FROM compendium_daily_quest_heroes original_hero
       WHERE original_hero.daily_quest_id = quest.id
         AND NOT EXISTS (
           SELECT 1 FROM compendium_user_quest_rerolls reroll
           WHERE reroll.daily_quest_id = quest.id AND reroll.player_id = $3
         )
     ) hero ON TRUE
     WHERE quest.id = $1 AND quest_set.moscow_date = $2::date
     ORDER BY hero.position`,
    [questId, dateKey, playerId],
  );
  return rows.length ? { id: rows[0].id, heroIds: rows.map((row) => row.hero_id) } : null;
}

export async function existingCompletion(
  playerId: string,
  questId: string,
): Promise<QuestCompletion | null> {
  const row = await one<CompletionRow>(
    `SELECT matched_hero_id, matched_match_id::text, completed_at
     FROM compendium_user_quest_completions
     WHERE player_id = $1 AND daily_quest_id = $2`,
    [playerId, questId],
  );
  return row ? completionFromRow(row) : null;
}

export async function consumeCheckAllowance(playerId: string): Promise<boolean> {
  return transaction(async (client) => {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`compendium-rate:${playerId}`],
    );
    const row = await client.query<{
      attempt_count: number;
      is_current_window: boolean;
    }>(
      `SELECT attempt_count,
         window_started_at > NOW() - ($2::int * INTERVAL '1 second') AS is_current_window
       FROM compendium_check_rate_limits WHERE player_id = $1 FOR UPDATE`,
      [playerId, CHECK_RATE_WINDOW_SECONDS],
    );
    if (!row.rowCount) {
      await client.query(
        `INSERT INTO compendium_check_rate_limits(player_id) VALUES ($1)`,
        [playerId],
      );
      return true;
    }
    const current = row.rows[0];
    if (!current.is_current_window) {
      await client.query(
        `UPDATE compendium_check_rate_limits
         SET window_started_at = NOW(), attempt_count = 1, last_attempt_at = NOW()
         WHERE player_id = $1`,
        [playerId],
      );
      return true;
    }
    if (current.attempt_count >= CHECK_RATE_LIMIT) return false;
    await client.query(
      `UPDATE compendium_check_rate_limits
       SET attempt_count = attempt_count + 1, last_attempt_at = NOW()
       WHERE player_id = $1`,
      [playerId],
    );
    return true;
  });
}

async function currentCompletion(
  client: PoolClient,
  playerId: string,
  questId: string,
): Promise<QuestCompletion | null> {
  const row = await client.query<CompletionRow>(
    `SELECT matched_hero_id, matched_match_id::text, completed_at
     FROM compendium_user_quest_completions
     WHERE player_id = $1 AND daily_quest_id = $2`,
    [playerId, questId],
  );
  return row.rowCount ? completionFromRow(row.rows[0]) : null;
}

export async function recordQuestCompletion(input: {
  playerId: string;
  questId: string;
  heroId: number;
  matchId: string;
}): Promise<QuestCompletion> {
  return transaction(async (client) => {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`compendium-quest-mutation:${input.playerId}:${input.questId}`],
    );
    const alreadyCompleted = await currentCompletion(
      client,
      input.playerId,
      input.questId,
    );
    if (alreadyCompleted) return alreadyCompleted;

    const activeQuest = await client.query(
      `SELECT 1
       FROM compendium_daily_quests quest
       JOIN compendium_daily_quest_sets quest_set ON quest_set.id = quest.quest_set_id
       JOIN LATERAL (
         SELECT reroll_hero.hero_id
         FROM compendium_user_quest_rerolls reroll
         JOIN compendium_user_quest_reroll_heroes reroll_hero
           ON reroll_hero.reroll_id = reroll.id
         WHERE reroll.daily_quest_id = quest.id AND reroll.player_id = $3
         UNION ALL
         SELECT original_hero.hero_id
         FROM compendium_daily_quest_heroes original_hero
         WHERE original_hero.daily_quest_id = quest.id
           AND NOT EXISTS (
             SELECT 1 FROM compendium_user_quest_rerolls reroll
             WHERE reroll.daily_quest_id = quest.id AND reroll.player_id = $3
           )
       ) hero ON TRUE
       WHERE quest.id = $1
         AND hero.hero_id = $2
         AND quest_set.moscow_date =
           (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date
       FOR SHARE OF quest`,
      [input.questId, input.heroId, input.playerId],
    );
    if (!activeQuest.rowCount) {
      throw new CompendiumError("STALE_QUEST", "Задание больше не действует");
    }
    const inserted = await client.query<CompletionRow>(
      `INSERT INTO compendium_user_quest_completions
        (player_id, daily_quest_id, matched_hero_id, matched_match_id, reward_amount)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (player_id, daily_quest_id) DO NOTHING
       RETURNING matched_hero_id, matched_match_id::text, completed_at`,
      [
        input.playerId,
        input.questId,
        input.heroId,
        input.matchId,
        QUEST_REWARD_STARS,
      ],
    );
    if (inserted.rowCount) return completionFromRow(inserted.rows[0]);
    const concurrentCompletion = await currentCompletion(
      client,
      input.playerId,
      input.questId,
    );
    if (!concurrentCompletion) throw new Error("Completion conflict without row");
    return concurrentCompletion;
  });
}
