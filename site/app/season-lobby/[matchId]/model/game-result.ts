export type SeasonGameWinner = "a" | "b";

export type SeasonSeriesScore = {
  teamAScore: number;
  teamBScore: number;
  result: "team_a" | "draw" | "team_b";
};

export function isFinalSeasonGame(
  currentGameNumber: number,
  bestOf: number,
): boolean {
  return currentGameNumber >= bestOf;
}

export function seasonSeriesScore(
  winners: readonly SeasonGameWinner[],
): SeasonSeriesScore {
  const teamAScore = winners.filter((winner) => winner === "a").length;
  const teamBScore = winners.filter((winner) => winner === "b").length;
  return {
    teamAScore,
    teamBScore,
    result: teamAScore === teamBScore
      ? "draw"
      : teamAScore > teamBScore
        ? "team_a"
        : "team_b",
  };
}
