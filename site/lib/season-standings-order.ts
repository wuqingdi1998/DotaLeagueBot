export type SeasonStandingPerformance = {
  nickname: string;
  points: number;
  winRate: number | null;
  playedRounds: number;
};

export type SeasonPenaltyStageOrder = {
  nickname: string;
  penaltyStages: Array<number | null>;
};

export function compareSeasonStandingPerformance(
  left: SeasonStandingPerformance,
  right: SeasonStandingPerformance,
) {
  return (
    right.points - left.points ||
    (right.winRate ?? -1) - (left.winRate ?? -1) ||
    right.playedRounds - left.playedRounds ||
    left.nickname.localeCompare(right.nickname, "ru")
  );
}

export function compareSeasonPenaltyStages(
  left: SeasonPenaltyStageOrder,
  right: SeasonPenaltyStageOrder,
) {
  const stageCount = Math.max(
    left.penaltyStages.length,
    right.penaltyStages.length,
  );
  for (let index = 0; index < stageCount; index += 1) {
    const difference =
      (right.penaltyStages[index] ?? -1) -
      (left.penaltyStages[index] ?? -1);
    if (difference !== 0) return difference;
  }
  return left.nickname.localeCompare(right.nickname, "ru");
}
