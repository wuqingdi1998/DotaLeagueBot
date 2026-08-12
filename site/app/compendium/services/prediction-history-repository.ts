import { query } from "@/lib/db";
import type {
  PredictionHistoryDay,
  PredictionHistoryMatchSource,
  PredictionHistoryPickSource,
} from "../model/prediction-history";
import { buildPredictionHistory } from "../model/prediction-history";
import type { PredictionScore } from "../model/predictions";

type HistoryMatchRow = {
  id: string;
  moscow_date: string;
  position: number;
  team_a_name: string;
  team_b_name: string;
  actual_score: PredictionScore | null;
};

type HistoryPickRow = {
  moscow_date: string;
  match_id: string;
  player_id: string;
  dota_id: string;
  player_name: string;
  predicted_score: PredictionScore;
  reward_amount: number | null;
};

export async function loadPredictionHistory(): Promise<PredictionHistoryDay[]> {
  const [matchRows, pickRows] = await Promise.all([
    query<HistoryMatchRow>(
      `SELECT match.id::text, match.moscow_date::text, match.position,
         match.team_a_name, match.team_b_name, match.actual_score
       FROM compendium_prediction_matches match
       ORDER BY match.moscow_date DESC, match.position`,
    ),
    query<HistoryPickRow>(
      `SELECT match.moscow_date::text, match.id::text AS match_id,
         player.discord_id::text AS player_id,
         player.steam_id32::text AS dota_id,
         player.ingame_name AS player_name,
         pick.predicted_score, reward.reward_amount
       FROM compendium_prediction_matches match
       JOIN compendium_prediction_picks pick ON pick.match_id = match.id
       JOIN players player ON player.discord_id = pick.player_id
       LEFT JOIN compendium_prediction_rewards reward
         ON reward.match_id = pick.match_id AND reward.player_id = pick.player_id
       ORDER BY match.moscow_date DESC, player.ingame_name, match.position`,
    ),
  ]);
  const matches: PredictionHistoryMatchSource[] = matchRows.map((row) => ({
      id: row.id,
      dateKey: row.moscow_date,
      position: row.position,
      teamAName: row.team_a_name,
      teamBName: row.team_b_name,
      actualScore: row.actual_score,
  }));
  const picks: PredictionHistoryPickSource[] = pickRows.map((row) => ({
    dateKey: row.moscow_date,
    matchId: row.match_id,
    playerId: row.player_id,
    dotaId: row.dota_id,
    playerName: row.player_name,
    predictedScore: row.predicted_score,
    rewardStars: row.reward_amount,
  }));
  return buildPredictionHistory(matches, picks);
}
