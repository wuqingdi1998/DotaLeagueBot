import { transaction } from "@/lib/db";
import { BONUS_QUEST_STAR_THRESHOLD } from "../model/constants";
import { CompendiumError } from "../model/errors";
import {
  starRaceQuestByDate,
  starRaceQuestPhase,
} from "../model/star-race";
import { currentMoscowDay } from "../model/time";
import { dailyChallengeRewardStars } from "../model/weekend-bonus";
import { loadFinalPrediction } from "../services/star-race-final-prediction-repository";

export type ManualCompletionResult = {
  rewardStars: number;
  wasCreated: boolean;
};

export async function completeDailyQuestManually(input: {
  playerId: string;
  questId: string;
  administratorId: string;
  now?: Date;
}): Promise<ManualCompletionResult> {
  const { dateKey } = currentMoscowDay(input.now);
  const rewardStars = dailyChallengeRewardStars(dateKey);
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `compendium-quest-mutation:${input.playerId}:${input.questId}`,
    ]);
    const quest = await client.query(
      `SELECT 1
       FROM compendium_daily_quests quest
       JOIN compendium_daily_quest_sets quest_set
         ON quest_set.id = quest.quest_set_id
       JOIN players player ON player.discord_id = quest.player_id
       WHERE quest.id = $1
         AND quest.player_id = $2
         AND player.is_archived = FALSE
         AND quest_set.moscow_date = $3::date
         AND (
           quest.position <= 3
           OR COALESCE((
             SELECT total_stars
             FROM compendium_player_star_totals player_total
             WHERE player_total.player_id = $2
           ), 0) >= $4
         )
       FOR SHARE OF quest`,
      [input.questId, input.playerId, dateKey, BONUS_QUEST_STAR_THRESHOLD],
    );
    if (!quest.rowCount) {
      throw new CompendiumError(
        "STALE_QUEST",
        "Участнику недоступно это испытание сегодня",
      );
    }
    const inserted = await client.query(
      `INSERT INTO compendium_user_quest_completions
         (player_id, daily_quest_id, matched_hero_id, matched_match_id,
          reward_amount, completion_source, completed_manually_by)
       VALUES ($1, $2, NULL, NULL, $3, 'manual', $4)
       ON CONFLICT (player_id, daily_quest_id) DO NOTHING
       RETURNING id`,
      [input.playerId, input.questId, rewardStars, input.administratorId],
    );
    return { rewardStars, wasCreated: Boolean(inserted.rowCount) };
  });
}

export async function completeStarRaceQuestManually(input: {
  playerId: string;
  dateKey: string;
  administratorId: string;
  now?: Date;
}): Promise<ManualCompletionResult> {
  const now = input.now ?? new Date();
  const quest = starRaceQuestByDate(input.dateKey);
  const rewardStars = quest?.rewardStars ?? null;
  const finalPredictionOpenedAt =
    quest?.requirement?.kind === "final-winner-prediction"
      ? (await loadFinalPrediction()).openedAt
      : null;
  if (
    !quest ||
    rewardStars === null ||
    !quest.requirement ||
    starRaceQuestPhase(quest, now, finalPredictionOpenedAt) !== "active"
  ) {
    throw new CompendiumError(
      "STAR_RACE_NOT_ACTIVE",
      "Испытание гонки сейчас недоступно",
    );
  }
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `compendium-star-race:${input.playerId}:${input.dateKey}`,
    ]);
    const player = await client.query(
      `SELECT 1 FROM players
       WHERE discord_id = $1 AND is_archived = FALSE
       FOR SHARE`,
      [input.playerId],
    );
    if (!player.rowCount) {
      throw new CompendiumError("QUEST_NOT_FOUND", "Участник не найден");
    }
    const inserted = await client.query(
      `INSERT INTO compendium_star_race_quest_completions
         (player_id, moscow_date, reward_amount, completed_manually_by)
       VALUES ($1, $2::date, $3, $4)
       ON CONFLICT (player_id, moscow_date) DO NOTHING
       RETURNING id`,
      [
        input.playerId,
        input.dateKey,
        rewardStars,
        input.administratorId,
      ],
    );
    return {
      rewardStars,
      wasCreated: Boolean(inserted.rowCount),
    };
  });
}
