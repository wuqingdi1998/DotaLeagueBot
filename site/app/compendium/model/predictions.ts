export const predictionScores = ["2:0", "2:1", "1:2", "0:2"] as const;

export type PredictionScore = (typeof predictionScores)[number];

export function isPredictionScore(value: unknown): value is PredictionScore {
  return typeof value === "string" && predictionScores.includes(value as PredictionScore);
}

function winner(score: PredictionScore): "team-a" | "team-b" {
  return score.startsWith("2") ? "team-a" : "team-b";
}

export function predictionRewardStars(
  predictedScore: PredictionScore,
  actualScore: PredictionScore,
): number {
  if (predictedScore === actualScore) return 2;
  return winner(predictedScore) === winner(actualScore) ? 1 : 0;
}

