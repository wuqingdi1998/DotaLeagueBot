import { one, transaction } from "@/lib/db";
import { FINAL_PREDICTION_DATE } from "../model/star-race";

type FinalPredictionRow = {
  team_names: string[];
  winner_position: number | null;
  predicted_position: number | null;
};

export type FinalPredictionRecord = {
  teams: string[];
  winnerPosition: number | null;
  selectedPosition: number | null;
};

export async function loadFinalPrediction(
  playerId?: string,
): Promise<FinalPredictionRecord> {
  const row = await one<FinalPredictionRow>(
    `SELECT contest.team_names, contest.winner_position,
       pick.predicted_position
     FROM compendium_star_race_final_predictions contest
     LEFT JOIN compendium_star_race_final_prediction_picks pick
       ON pick.quest_date = contest.quest_date AND pick.player_id = $2
     WHERE contest.quest_date = $1::date`,
    [FINAL_PREDICTION_DATE, playerId ?? null],
  );
  return {
    teams: row?.team_names ?? [],
    winnerPosition: row?.winner_position ?? null,
    selectedPosition: row?.predicted_position ?? null,
  };
}

export async function saveFinalPredictionTeams(input: {
  teams: string[];
  administratorId: string;
  opensAt: Date;
  now: Date;
}): Promise<void> {
  await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      "compendium-star-race-final-prediction",
    ]);
    if (input.now.getTime() >= input.opensAt.getTime()) {
      throw new Error("PREDICTION_LOCKED");
    }
    const existing = await client.query<{ winner_position: number | null }>(
      `SELECT winner_position FROM compendium_star_race_final_predictions
       WHERE quest_date = $1::date FOR UPDATE`,
      [FINAL_PREDICTION_DATE],
    );
    if (existing.rows[0]?.winner_position !== null && existing.rowCount) {
      throw new Error("PREDICTION_LOCKED");
    }
    await client.query(
      `INSERT INTO compendium_star_race_final_predictions
         (quest_date, team_names, configured_by)
       VALUES ($1::date, $2::text[], $3)
       ON CONFLICT (quest_date) DO UPDATE SET
         team_names = EXCLUDED.team_names,
         configured_by = EXCLUDED.configured_by,
         updated_at = NOW()`,
      [FINAL_PREDICTION_DATE, input.teams, input.administratorId],
    );
  });
}

export async function saveFinalPredictionPick(input: {
  playerId: string;
  position: number;
  opensAt: Date;
  closesAt: Date;
  now: Date;
}): Promise<void> {
  await transaction(async (client) => {
    const contest = await client.query<{ winner_position: number | null }>(
      `SELECT winner_position FROM compendium_star_race_final_predictions
       WHERE quest_date = $1::date FOR UPDATE`,
      [FINAL_PREDICTION_DATE],
    );
    if (!contest.rowCount) throw new Error("PREDICTION_NOT_FOUND");
    if (input.now < input.opensAt) throw new Error("PREDICTION_NOT_OPEN");
    if (input.now >= input.closesAt || contest.rows[0].winner_position !== null) {
      throw new Error("PREDICTION_LOCKED");
    }
    await client.query(
      `INSERT INTO compendium_star_race_final_prediction_picks
         (quest_date, player_id, predicted_position, picked_at)
       VALUES ($1::date, $2, $3, $4)
       ON CONFLICT (quest_date, player_id) DO UPDATE SET
         predicted_position = EXCLUDED.predicted_position,
         picked_at = EXCLUDED.picked_at`,
      [FINAL_PREDICTION_DATE, input.playerId, input.position, input.now],
    );
  });
}

export async function recordFinalPredictionWinner(input: {
  position: number;
  administratorId: string;
  closesAt: Date;
  rewardStars: number;
  now: Date;
}): Promise<number> {
  return transaction(async (client) => {
    const contest = await client.query<{ winner_position: number | null }>(
      `SELECT winner_position FROM compendium_star_race_final_predictions
       WHERE quest_date = $1::date FOR UPDATE`,
      [FINAL_PREDICTION_DATE],
    );
    if (!contest.rowCount) throw new Error("PREDICTION_NOT_FOUND");
    if (input.now < input.closesAt) throw new Error("PREDICTION_NOT_OPEN");
    if (contest.rows[0].winner_position !== null) {
      throw new Error("PREDICTION_LOCKED");
    }
    await client.query(
      `UPDATE compendium_star_race_final_predictions SET
         winner_position = $2, result_recorded_by = $3,
         result_recorded_at = $4, updated_at = NOW()
       WHERE quest_date = $1::date`,
      [FINAL_PREDICTION_DATE, input.position, input.administratorId, input.now],
    );
    const rewarded = await client.query(
      `INSERT INTO compendium_star_race_quest_completions
         (player_id, moscow_date, reward_amount, completed_at)
       SELECT player_id, quest_date, $3, $4
       FROM compendium_star_race_final_prediction_picks
       WHERE quest_date = $1::date AND predicted_position = $2
       ON CONFLICT (player_id, moscow_date) DO NOTHING
       RETURNING id`,
      [FINAL_PREDICTION_DATE, input.position, input.rewardStars, input.closesAt],
    );
    return rewarded.rowCount ?? 0;
  });
}
