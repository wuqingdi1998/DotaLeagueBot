import { one, transaction } from "@/lib/db";
import { DAILY_REROLL_COUNT } from "../model/constants";
import { CompendiumError } from "../model/errors";
import { generateRerollQuestHeroes } from "../model/quests";

export async function dailyRerollsRemaining(
  dateKey: string,
  playerId: string,
): Promise<number> {
  const row = await one<{ has_used_reroll: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM compendium_user_quest_rerolls reroll
       WHERE reroll.quest_set_id = quest_set.id
         AND reroll.player_id = $2
     ) AS has_used_reroll
     FROM compendium_daily_quest_sets quest_set
     WHERE quest_set.moscow_date = $1::date`,
    [dateKey, playerId],
  );
  return row?.has_used_reroll ? 0 : DAILY_REROLL_COUNT;
}

export async function recordDailyQuestReroll(input: {
  playerId: string;
  questId: string;
  dateKey: string;
}): Promise<void> {
  await transaction(async (client) => {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`compendium-reroll:${input.playerId}:${input.dateKey}`],
    );
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`compendium-quest-mutation:${input.playerId}:${input.questId}`],
    );
    const quest = await client.query<{ quest_set_id: string }>(
      `SELECT quest.quest_set_id::text
       FROM compendium_daily_quests quest
       JOIN compendium_daily_quest_sets quest_set
         ON quest_set.id = quest.quest_set_id
       WHERE quest.id = $1
         AND quest_set.moscow_date = $2::date
         AND quest_set.moscow_date =
           (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date
       FOR SHARE OF quest`,
      [input.questId, input.dateKey],
    );
    if (!quest.rowCount) {
      throw new CompendiumError("STALE_QUEST", "Задание больше не действует");
    }
    const questSetId = quest.rows[0].quest_set_id;

    const usedReroll = await client.query(
      `SELECT 1 FROM compendium_user_quest_rerolls
       WHERE player_id = $1 AND quest_set_id = $2`,
      [input.playerId, questSetId],
    );
    if (usedReroll.rowCount) {
      throw new CompendiumError(
        "REROLL_USED",
        "Реролл на сегодня уже использован",
      );
    }

    const completion = await client.query(
      `SELECT 1 FROM compendium_user_quest_completions
       WHERE player_id = $1 AND daily_quest_id = $2`,
      [input.playerId, input.questId],
    );
    if (completion.rowCount) {
      throw new CompendiumError(
        "QUEST_COMPLETED",
        "Выполненное задание нельзя заменить",
      );
    }

    const dailyHeroes = await client.query<{ hero_id: number }>(
      `SELECT hero.hero_id
       FROM compendium_daily_quest_heroes hero
       WHERE hero.quest_set_id = $1`,
      [questSetId],
    );
    const replacementHeroes = generateRerollQuestHeroes(
      dailyHeroes.rows.map((hero) => hero.hero_id),
    );
    const reroll = await client.query<{ id: string }>(
      `INSERT INTO compendium_user_quest_rerolls
        (player_id, quest_set_id, daily_quest_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [input.playerId, questSetId, input.questId],
    );
    for (let index = 0; index < replacementHeroes.length; index += 1) {
      await client.query(
        `INSERT INTO compendium_user_quest_reroll_heroes
          (reroll_id, hero_id, position)
         VALUES ($1, $2, $3)`,
        [reroll.rows[0].id, replacementHeroes[index].id, index + 1],
      );
    }
  });
}
