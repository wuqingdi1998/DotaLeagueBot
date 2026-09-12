export type WinnerSide = "a" | "b";
export type CaptainReport = { dotaMatchId: string; winnerSide: WinnerSide };

export function seriesScore(winners: WinnerSide[]) {
  return winners.reduce(
    (score, winner) => ({
      teamA: score.teamA + (winner === "a" ? 1 : 0),
      teamB: score.teamB + (winner === "b" ? 1 : 0),
    }),
    { teamA: 0, teamB: 0 },
  );
}

export function isSeriesComplete(bestOf: number, winners: WinnerSide[]) {
  const score = seriesScore(winners);
  if (bestOf === 2) return winners.length >= 2;
  const winsNeeded = Math.floor(bestOf / 2) + 1;
  return score.teamA >= winsNeeded || score.teamB >= winsNeeded;
}

export function completionButtonLabel(bestOf: number, gameNumber: number) {
  return bestOf === 1 ? "Матч завершён" : `Карта ${gameNumber} завершена`;
}

export function evaluateCaptainReports(reports: CaptainReport[]) {
  if (reports.length < 2) return "waiting" as const;
  const [first, second] = reports;
  return first.dotaMatchId === second.dotaMatchId &&
    first.winnerSide === second.winnerSide
    ? "agreed" as const
    : "disputed" as const;
}
