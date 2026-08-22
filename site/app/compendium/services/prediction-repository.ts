import type { PoolClient } from "pg";
import { query, transaction } from "@/lib/db";
import {
  isPredictionScoreForWinsRequired,
  predictionRewardStars,
  predictionScoresForWinsRequired,
  type PredictionScore,
  type PredictionWinsRequired,
} from "../model/predictions";
import { compendiumTeamLogoUrl } from "../model/teams";
import type { DailyPredictionMatch } from "../model/types";

type PredictionRow = {
  id: string;
  moscow_date: string;
  position: number;
  starts_at: Date;
  locks_at: Date;
  opens_at: Date;
  team_a_key: string;
  team_a_name: string;
  team_b_key: string;
  team_b_name: string;
  wins_required: PredictionWinsRequired;
  exact_score_reward: number;
  outcome_reward: number;
  predicted_score: PredictionScore | null;
  actual_score: PredictionScore | null;
  reward_amount: number | null;
};

export type PredictionMatchInput = {
  position: number;
  startsAt: Date;
  teamA: { key: string; name: string; logoPath: string };
  teamB: { key: string; name: string; logoPath: string };
};

export type PredictionAdminMatch = Omit<
  DailyPredictionMatch,
  "predictedScore" | "rewardStars" | "isLocked" | "isOpen"
>;

function mapPrediction(row: PredictionRow, now: Date): DailyPredictionMatch {
  return {
    id: row.id,
    moscowDate: row.moscow_date,
    position: row.position,
    startsAt: row.starts_at.toISOString(),
    opensAt: row.opens_at.toISOString(),
    teamA: { key: row.team_a_key, name: row.team_a_name, logoUrl: compendiumTeamLogoUrl(row.team_a_key) },
    teamB: { key: row.team_b_key, name: row.team_b_name, logoUrl: compendiumTeamLogoUrl(row.team_b_key) },
    scoreOptions: predictionScoresForWinsRequired(row.wins_required),
    exactScoreRewardStars: row.exact_score_reward,
    outcomeRewardStars: row.outcome_reward,
    predictedScore: row.predicted_score,
    actualScore: row.actual_score,
    rewardStars: row.reward_amount,
    isOpen: row.opens_at.getTime() <= now.getTime(),
    isLocked:
      row.actual_score !== null ||
      row.opens_at.getTime() > now.getTime() ||
      row.locks_at.getTime() <= now.getTime(),
  };
}

const predictionLockSelect = `(SELECT MIN(first_match.starts_at)
  FROM compendium_prediction_matches first_match
  WHERE first_match.moscow_date = match.moscow_date)`;

const predictionSelect = `SELECT match.id::text, match.moscow_date::text,
  match.position, match.starts_at, ${predictionLockSelect} AS locks_at,
  day.opens_at,
  match.team_a_key, match.team_a_name,
  match.team_b_key, match.team_b_name, match.wins_required,
  match.exact_score_reward, match.outcome_reward, pick.predicted_score,
  match.actual_score, reward.reward_amount
 FROM compendium_prediction_matches match
 JOIN compendium_prediction_days day ON day.moscow_date = match.moscow_date
 LEFT JOIN compendium_prediction_picks pick
   ON pick.match_id = match.id AND pick.player_id = $2
 LEFT JOIN compendium_prediction_rewards reward
   ON reward.match_id = match.id AND reward.player_id = $2`;

export async function loadDailyPredictions(
  dateKey: string,
  playerId: string,
  now: Date,
): Promise<DailyPredictionMatch[]> {
  const availableDays = await query<{ moscow_date: string }>(
    `SELECT day.moscow_date::text
     FROM compendium_prediction_days day
     WHERE day.opens_at <= $1
       AND day.moscow_date >= $2::date
       AND EXISTS (
         SELECT 1 FROM compendium_prediction_matches match
         WHERE match.moscow_date = day.moscow_date
           AND match.starts_at > $1
       )
     ORDER BY day.moscow_date
     LIMIT 1`,
    [now, dateKey],
  );
  const displayedDate = availableDays[0]?.moscow_date ?? dateKey;
  const rows = await query<PredictionRow>(
    `${predictionSelect} WHERE match.moscow_date = $1::date ORDER BY match.position`,
    [displayedDate, playerId],
  );
  return rows.map((row) => mapPrediction(row, now));
}

async function loadPredictionWithClient(
  client: PoolClient,
  matchId: string,
  playerId: string,
  now: Date,
): Promise<DailyPredictionMatch> {
  const result = await client.query<PredictionRow>(
    `${predictionSelect} WHERE match.id = $1`,
    [matchId, playerId],
  );
  if (!result.rows[0]) throw new Error("PREDICTION_NOT_FOUND");
  return mapPrediction(result.rows[0], now);
}

export async function recordPredictionPick(input: {
  matchId: string;
  playerId: string;
  score: PredictionScore;
  now: Date;
}): Promise<DailyPredictionMatch> {
  return transaction(async (client) => {
    const match = await client.query<{
      locks_at: Date;
      opens_at: Date;
      actual_score: string | null;
      wins_required: PredictionWinsRequired;
    }>(
      `SELECT ${predictionLockSelect} AS locks_at,
         day.opens_at, match.actual_score, match.wins_required
       FROM compendium_prediction_matches match
       JOIN compendium_prediction_days day
         ON day.moscow_date = match.moscow_date
       WHERE match.id = $1
       FOR UPDATE OF match`,
      [input.matchId],
    );
    const row = match.rows[0];
    if (!row) throw new Error("PREDICTION_NOT_FOUND");
    if (row.opens_at > input.now) throw new Error("PREDICTION_NOT_OPEN");
    if (row.actual_score || row.locks_at <= input.now) {
      throw new Error("PREDICTION_LOCKED");
    }
    if (!isPredictionScoreForWinsRequired(input.score, row.wins_required)) {
      throw new Error("PREDICTION_SCORE_INVALID");
    }
    await client.query(
      `INSERT INTO compendium_prediction_picks(match_id, player_id, predicted_score)
       VALUES ($1, $2, $3)
       ON CONFLICT (match_id, player_id) DO UPDATE SET
         predicted_score = EXCLUDED.predicted_score,
         updated_at = NOW()`,
      [input.matchId, input.playerId, input.score],
    );
    return loadPredictionWithClient(client, input.matchId, input.playerId, input.now);
  });
}

export async function replacePredictionMatches(input: {
  dateKey: string;
  opensAt: Date;
  administratorId: string;
  matches: PredictionMatchInput[];
}): Promise<void> {
  await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`compendium-predictions:${input.dateKey}`]);
    await client.query(
      `INSERT INTO compendium_prediction_days(
         moscow_date, opens_at, configured_by
       ) VALUES ($1::date, $2, $3)
       ON CONFLICT (moscow_date) DO UPDATE SET
         opens_at = EXCLUDED.opens_at,
         configured_by = EXCLUDED.configured_by,
         updated_at = NOW()`,
      [input.dateKey, input.opensAt, input.administratorId],
    );
    const protectedTrailingMatch = await client.query(
      `SELECT 1 FROM compendium_prediction_matches
       WHERE moscow_date = $1::date AND position > $2
         AND (actual_score IS NOT NULL OR EXISTS (
           SELECT 1 FROM compendium_prediction_picks pick
           WHERE pick.match_id = compendium_prediction_matches.id
         ))`,
      [input.dateKey, input.matches.length],
    );
    if (protectedTrailingMatch.rowCount) throw new Error("PREDICTION_PICKS_LOCKED");
    await client.query(
      `DELETE FROM compendium_prediction_matches
       WHERE moscow_date = $1::date AND position > $2 AND actual_score IS NULL`,
      [input.dateKey, input.matches.length],
    );
    for (const match of input.matches) {
      await client.query(
        `INSERT INTO compendium_prediction_matches(
           moscow_date, position, starts_at,
           team_a_key, team_a_name, team_a_logo_path,
           team_b_key, team_b_name, team_b_logo_path, configured_by
         ) VALUES ($1::date, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (moscow_date, position) DO UPDATE SET
           starts_at = EXCLUDED.starts_at,
           team_a_key = EXCLUDED.team_a_key,
           team_a_name = EXCLUDED.team_a_name,
           team_a_logo_path = EXCLUDED.team_a_logo_path,
           team_b_key = EXCLUDED.team_b_key,
           team_b_name = EXCLUDED.team_b_name,
           team_b_logo_path = EXCLUDED.team_b_logo_path,
           configured_by = EXCLUDED.configured_by,
           updated_at = NOW()
         WHERE compendium_prediction_matches.actual_score IS NULL`,
        [input.dateKey, match.position, match.startsAt, match.teamA.key, match.teamA.name,
          match.teamA.logoPath, match.teamB.key, match.teamB.name, match.teamB.logoPath,
          input.administratorId],
      );
    }
  });
}

export async function relocatePredictionMatches(input: {
  sourceDateKey: string;
  dateKey: string;
  opensAt: Date;
  administratorId: string;
  matches: PredictionMatchInput[];
}): Promise<void> {
  await transaction(async (client) => {
    for (const dateKey of [input.sourceDateKey, input.dateKey].sort()) {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `compendium-predictions:${dateKey}`,
      ]);
    }
    const storedMatches = await client.query<{
      id: string;
      position: number;
      actual_score: PredictionScore | null;
    }>(
      `SELECT id::text, position, actual_score
       FROM compendium_prediction_matches
       WHERE moscow_date = $1::date
       ORDER BY position
       FOR UPDATE`,
      [input.sourceDateKey],
    );
    if (!storedMatches.rowCount) throw new Error("PREDICTION_NOT_FOUND");
    if (storedMatches.rowCount !== input.matches.length) {
      throw new Error("PREDICTION_MATCH_COUNT_LOCKED");
    }
    if (storedMatches.rows.some((match) => match.actual_score !== null)) {
      throw new Error("PREDICTION_RESULT_LOCKED");
    }
    const targetDay = await client.query(
      "SELECT 1 FROM compendium_prediction_days WHERE moscow_date = $1::date",
      [input.dateKey],
    );
    if (targetDay.rowCount) throw new Error("PREDICTION_TARGET_EXISTS");
    await client.query(
      `INSERT INTO compendium_prediction_days(
         moscow_date, opens_at, configured_by
       ) VALUES ($1::date, $2, $3)`,
      [input.dateKey, input.opensAt, input.administratorId],
    );
    for (const [index, match] of input.matches.entries()) {
      const storedMatch = storedMatches.rows[index];
      if (storedMatch.position !== match.position) {
        throw new Error("PREDICTION_MATCH_COUNT_LOCKED");
      }
      await client.query(
        `UPDATE compendium_prediction_matches SET
           moscow_date = $2::date, starts_at = $3,
           team_a_key = $4, team_a_name = $5, team_a_logo_path = $6,
           team_b_key = $7, team_b_name = $8, team_b_logo_path = $9,
           configured_by = $10, updated_at = NOW()
         WHERE id = $1`,
        [storedMatch.id, input.dateKey, match.startsAt,
          match.teamA.key, match.teamA.name, match.teamA.logoPath,
          match.teamB.key, match.teamB.name, match.teamB.logoPath,
          input.administratorId],
      );
    }
    await client.query(
      "DELETE FROM compendium_prediction_days WHERE moscow_date = $1::date",
      [input.sourceDateKey],
    );
  });
}

export async function loadPredictionAdminMatches(now: Date): Promise<PredictionAdminMatch[]> {
  const rows = await query<PredictionRow>(
    `SELECT match.id::text, match.moscow_date::text, match.position,
       match.starts_at, ${predictionLockSelect} AS locks_at,
       day.opens_at, match.team_a_key, match.team_a_name,
       match.team_b_key, match.team_b_name, match.wins_required,
       match.exact_score_reward, match.outcome_reward,
       NULL::varchar AS predicted_score,
       match.actual_score, NULL::smallint AS reward_amount
     FROM compendium_prediction_matches match
     JOIN compendium_prediction_days day ON day.moscow_date = match.moscow_date
     ORDER BY match.moscow_date, match.position`,
  );
  return rows.map((row) => {
    const match = mapPrediction(row, now);
    return {
      id: match.id,
      position: match.position,
      startsAt: match.startsAt,
      opensAt: match.opensAt,
      moscowDate: match.moscowDate,
      teamA: match.teamA,
      teamB: match.teamB,
      scoreOptions: match.scoreOptions,
      exactScoreRewardStars: match.exactScoreRewardStars,
      outcomeRewardStars: match.outcomeRewardStars,
      actualScore: match.actualScore,
    };
  });
}

export async function deletePredictionMatch(matchId: string): Promise<void> {
  await transaction(async (client) => {
    const deletedMatches = await client.query<{ moscow_date: string }>(
      `DELETE FROM compendium_prediction_matches
       WHERE id = $1 RETURNING moscow_date::text`,
      [matchId],
    );
    const deleted = deletedMatches.rows[0];
    if (!deleted) throw new Error("PREDICTION_NOT_FOUND");
    await client.query(
      `DELETE FROM compendium_prediction_days day
       WHERE day.moscow_date = $1::date
         AND NOT EXISTS (
           SELECT 1 FROM compendium_prediction_matches match
           WHERE match.moscow_date = day.moscow_date
         )`,
      [deleted.moscow_date],
    );
  });
}

export async function deletePredictionDay(dateKey: string): Promise<number> {
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`compendium-predictions:${dateKey}`]);
    const count = await client.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total
       FROM compendium_prediction_matches WHERE moscow_date = $1::date`,
      [dateKey],
    );
    await client.query(
      "DELETE FROM compendium_prediction_days WHERE moscow_date = $1::date",
      [dateKey],
    );
    return Number(count.rows[0]?.total ?? 0);
  });
}

export async function recordPredictionResult(input: {
  matchId: string;
  score: PredictionScore;
  administratorId: string;
}): Promise<number> {
  return transaction(async (client) => {
    const match = await client.query<{
      actual_score: PredictionScore | null;
      wins_required: PredictionWinsRequired;
      exact_score_reward: number;
      outcome_reward: number;
    }>(
      `SELECT actual_score, wins_required, exact_score_reward, outcome_reward
       FROM compendium_prediction_matches
       WHERE id = $1 FOR UPDATE`,
      [input.matchId],
    );
    const row = match.rows[0];
    if (!row) throw new Error("PREDICTION_NOT_FOUND");
    if (row.actual_score) throw new Error("PREDICTION_RESULT_LOCKED");
    if (!isPredictionScoreForWinsRequired(input.score, row.wins_required)) {
      throw new Error("PREDICTION_SCORE_INVALID");
    }
    await client.query(
      `UPDATE compendium_prediction_matches SET actual_score = $2,
         result_recorded_by = $3, updated_at = NOW() WHERE id = $1`,
      [input.matchId, input.score, input.administratorId],
    );
    const picks = await client.query<{ player_id: string; predicted_score: PredictionScore }>(
      `SELECT player_id::text, predicted_score
       FROM compendium_prediction_picks WHERE match_id = $1`,
      [input.matchId],
    );
    for (const pick of picks.rows) {
      await client.query(
        `INSERT INTO compendium_prediction_rewards(match_id, player_id, reward_amount)
         VALUES ($1, $2, $3) ON CONFLICT (match_id, player_id) DO NOTHING`,
        [input.matchId, pick.player_id, predictionRewardStars(
          pick.predicted_score,
          input.score,
          {
            exactScore: row.exact_score_reward,
            correctOutcome: row.outcome_reward,
          },
        )],
      );
    }
    return picks.rowCount ?? 0;
  });
}
