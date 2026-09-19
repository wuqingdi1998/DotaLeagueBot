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
};

function isFullyCompletedRegularRound(round: SeasonOverviewRound) {
  if (
    !round.is_visible ||
    round.round_kind !== "regular" ||
    round.lobby_count < 1 ||
    round.lobbies.length !== round.lobby_count
  ) {
    return false;
  }
  const matches = round.lobbies.flatMap((lobby) => lobby.matches);
  return (
    matches.length === round.lobby_count &&
    matches.every((match) => match.status === "completed")
  );
}

/** Returns the newest public round only after every configured lobby is done. */
export function latestFullyCompletedSeasonRound<
  Round extends SeasonOverviewRound,
>(rounds: readonly Round[]): Round | undefined {
  return rounds
    .filter(isFullyCompletedRegularRound)
    .toSorted((left, right) => right.round_number - left.round_number)[0];
}
