export const bestOfThreePredictionScores = ["2:0", "2:1", "1:2", "0:2"] as const;
export const bestOfFivePredictionScores = ["3:0", "3:1", "3:2", "2:3", "1:3", "0:3"] as const;
export const predictionScores = [
  ...bestOfThreePredictionScores,
  ...bestOfFivePredictionScores,
] as const;

export type PredictionScore = (typeof predictionScores)[number];
export type PredictionWinsRequired = 2 | 3;

export type PredictionRewards = {
  exactScore: number;
  correctOutcome: number;
};

export function isPredictionScore(value: unknown): value is PredictionScore {
  return typeof value === "string" && predictionScores.includes(value as PredictionScore);
}

export function predictionScoresForWinsRequired(
  winsRequired: PredictionWinsRequired,
): readonly PredictionScore[] {
  return winsRequired === 3
    ? bestOfFivePredictionScores
    : bestOfThreePredictionScores;
}

export function isPredictionScoreForWinsRequired(
  value: unknown,
  winsRequired: PredictionWinsRequired,
): value is PredictionScore {
  return isPredictionScore(value) && predictionScoresForWinsRequired(winsRequired).includes(value);
}

export function predictionWinner(score: PredictionScore): "team-a" | "team-b" {
  const [teamAScore, teamBScore] = score.split(":").map(Number);
  return teamAScore > teamBScore ? "team-a" : "team-b";
}

export function predictionRewardStars(
  predictedScore: PredictionScore,
  actualScore: PredictionScore,
  rewards: PredictionRewards = { exactScore: 2, correctOutcome: 1 },
): number {
  if (predictedScore === actualScore) return rewards.exactScore;
  return predictionWinner(predictedScore) === predictionWinner(actualScore)
    ? rewards.correctOutcome
    : 0;
}
