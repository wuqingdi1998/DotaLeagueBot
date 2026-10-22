type Round = { round_number: number; round_kind: string; is_visible: boolean; results_announced?: boolean };
export function nextSeasonRoundNumber(rounds: readonly Round[]): number | null {
  const regular = rounds.filter((round) => round.round_kind === "regular");
  const lastAnnounced = Math.max(0, ...regular.filter((round) => round.results_announced).map((round) => round.round_number));
  return regular.find((round) => round.is_visible && round.round_number === lastAnnounced + 1)?.round_number ?? null;
}
