import type { PoolClient } from "pg";
import { query, transaction } from "@/lib/db";
import { predictionRewardStars, type PredictionScore } from "../model/predictions";
import { compendiumTeamLogoUrl } from "../model/teams";
import type { DailyPredictionMatch } from "../model/types";

type PredictionRow = {
  id: string;
  moscow_date: string;
  position: number;
  starts_at: Date;
  team_a_key: string;
  team_a_name: string;
  team_b_key: string;
  team_b_name: string;
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

export type PredictionAdminMatch = Omit<DailyPredictionMatch, "predictedScore" | "rewardStars" | "isLocked"> & {
  moscowDate: string;
};

function mapPrediction(row: PredictionRow, now: Date): DailyPredictionMatch {
  return {
    id: row.id,
    position: row.position,
    startsAt: row.starts_at.toISOString(),
    teamA: { key: row.team_a_key, name: row.team_a_name, logoUrl: compendiumTeamLogoUrl(row.team_a_key) },
    teamB: { key: row.team_b_key, name: row.team_b_name, logoUrl: compendiumTeamLogoUrl(row.team_b_key) },
    predictedScore: row.predicted_score,
    actualScore: row.actual_score,
    rewardStars: row.reward_amount,
    isLocked: row.actual_score !== null || row.starts_at.getTime() <= now.getTime(),
  };
}

const predictionSelect = `SELECT match.id::text, match.moscow_date::text,
  match.position, match.starts_at, match.team_a_key, match.team_a_name,
  match.team_b_key, match.team_b_name, pick.predicted_score,
  match.actual_score, reward.reward_amount
 FROM compendium_prediction_matches match
 LEFT JOIN compendium_prediction_picks pick
   ON pick.match_id = match.id AND pick.player_id = $2
 LEFT JOIN compendium_prediction_rewards reward
   ON reward.match_id = match.id AND reward.player_id = $2`;

export async function loadDailyPredictions(
  dateKey: string,
  playerId: string,
  now: Date,
): Promise<DailyPredictionMatch[]> {
  const rows = await query<PredictionRow>(
    `${predictionSelect} WHERE match.moscow_date = $1::date ORDER BY match.position`,
    [dateKey, playerId],
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
    const match = await client.query<{ starts_at: Date; moscow_date: string; actual_score: string | null }>(
      `SELECT starts_at, moscow_date::text, actual_score
       FROM compendium_prediction_matches WHERE id = $1 FOR UPDATE`,
      [input.matchId],
    );
    const row = match.rows[0];
    if (!row) throw new Error("PREDICTION_NOT_FOUND");
    const today = await client.query<{ today: string }>(
      "SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date::text AS today",
    );
    if (row.moscow_date !== today.rows[0].today || row.actual_score || row.starts_at <= input.now) {
      throw new Error("PREDICTION_LOCKED");
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
  administratorId: string;
  matches: PredictionMatchInput[];
}): Promise<void> {
  await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`compendium-predictions:${input.dateKey}`]);
    const dateCheck = await client.query<{ allowed: boolean }>(
      `SELECT $1::date > (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date AS allowed`,
      [input.dateKey],
    );
    if (!dateCheck.rows[0].allowed) throw new Error("PREDICTION_DEADLINE");
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
           updated_at = NOW()`,
        [input.dateKey, match.position, match.startsAt, match.teamA.key, match.teamA.name,
          match.teamA.logoPath, match.teamB.key, match.teamB.name, match.teamB.logoPath,
          input.administratorId],
      );
    }
  });
}

export async function loadPredictionAdminMatches(now: Date): Promise<PredictionAdminMatch[]> {
  const rows = await query<PredictionRow>(
    `SELECT match.id::text, match.moscow_date::text, match.position,
       match.starts_at, match.team_a_key, match.team_a_name,
       match.team_b_key, match.team_b_name, NULL::varchar AS predicted_score,
       match.actual_score, NULL::smallint AS reward_amount
     FROM compendium_prediction_matches match
     WHERE match.actual_score IS NULL
        OR match.moscow_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date
     ORDER BY match.moscow_date, match.position`,
  );
  return rows.map((row) => {
    const match = mapPrediction(row, now);
    return {
      id: match.id,
      moscowDate: row.moscow_date,
      position: match.position,
      startsAt: match.startsAt,
      teamA: match.teamA,
      teamB: match.teamB,
      actualScore: match.actualScore,
    };
  });
}

export async function recordPredictionResult(input: {
  matchId: string;
  score: PredictionScore;
  administratorId: string;
  now: Date;
}): Promise<number> {
  return transaction(async (client) => {
    const match = await client.query<{ starts_at: Date; actual_score: PredictionScore | null }>(
      `SELECT starts_at, actual_score FROM compendium_prediction_matches
       WHERE id = $1 FOR UPDATE`,
      [input.matchId],
    );
    const row = match.rows[0];
    if (!row) throw new Error("PREDICTION_NOT_FOUND");
    if (row.actual_score || row.starts_at > input.now) throw new Error("PREDICTION_RESULT_LOCKED");
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
        [input.matchId, pick.player_id, predictionRewardStars(pick.predicted_score, input.score)],
      );
    }
    return picks.rowCount ?? 0;
  });
}

