type SeasonOverviewMatch = {
  status: string;
};

type SeasonOverviewLobby = {
  matches: SeasonOverviewMatch[];
};

type SeasonOverviewRound = {
  is_visible: boolean;
  lobby_count: number;
  lobbies: SeasonOverviewLobby[];
  round_kind: "regular" | "finals";
  round_number: number;
  status: string;
};

function completedMatches(round: SeasonOverviewRound) {
  return round.lobbies.flatMap((lobby) => lobby.matches);
}

function isFullyCompletedRegularRound(round: SeasonOverviewRound) {
  if (
    !round.is_visible ||
    round.round_kind !== "regular" ||
    round.lobby_count < 1 ||
    round.lobbies.length !== round.lobby_count
  ) {
    return false;
  }
  const matches = completedMatches(round);
  return (
    matches.length === round.lobby_count &&
    matches.every((match) => match.status === "completed")
  );
}

function isFullyCompletedFinals(round: SeasonOverviewRound) {
  if (
    !round.is_visible ||
    round.round_kind !== "finals" ||
    round.status !== "completed"
  ) {
    return false;
  }
  const matches = completedMatches(round);
  return (
    matches.length === 2 &&
    matches.every((match) => match.status === "completed")
  );
}

function isFullyCompletedStage(round: SeasonOverviewRound) {
  return isFullyCompletedRegularRound(round) || isFullyCompletedFinals(round);
}

/** Returns the newest public stage after every required match is completed. */
export function latestFullyCompletedSeasonRound<
  Round extends SeasonOverviewRound,
>(rounds: readonly Round[]): Round | undefined {
  return rounds
    .filter(isFullyCompletedStage)
    .toSorted((left, right) => right.round_number - left.round_number)[0];
}
