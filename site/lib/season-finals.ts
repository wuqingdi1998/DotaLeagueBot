export type SeasonFinalMatch = {
  status: "draft" | "published" | "completed" | "cancelled";
  result: "team_a" | "draw" | "team_b" | null;
  participants: Array<{
    playerId: string;
    teamSide: "a" | "b";
  }>;
};

export function deriveSeasonFinalMedals<T extends { playerId: string }>(
  finalists: T[],
  matches: SeasonFinalMatch[],
): Array<T & { medal: "gold" | "silver" | null }> {
  const medals = new Map<string, "gold" | "silver">();
  for (const match of matches) {
    if (
      match.status !== "completed" ||
      !match.result ||
      match.result === "draw"
    ) {
      continue;
    }
    const winningSide = match.result === "team_a" ? "a" : "b";
    for (const participant of match.participants) {
      medals.set(
        participant.playerId,
        participant.teamSide === winningSide ? "gold" : "silver",
      );
    }
  }
  return finalists.map((finalist) => ({
    ...finalist,
    medal: medals.get(finalist.playerId) ?? null,
  }));
}

type SeasonFinalMedalist = {
  playerId: string;
  nickname: string;
  teamSide: "a" | "b";
};

type SeasonFinalMatchGroup<T extends SeasonFinalMedalist> = Omit<
  SeasonFinalMatch,
  "participants"
> & {
  id: number;
  lobbyName: string;
  lobbyOrder: number;
  teamAName: string;
  teamBName: string;
  participants: T[];
};

export function groupSeasonFinalMedalists<T extends SeasonFinalMedalist>(
  matches: Array<SeasonFinalMatchGroup<T>>,
) {
  const completedMatches = matches
    .filter(
      (match) =>
        match.status === "completed" &&
        (match.result === "team_a" || match.result === "team_b"),
    )
    .sort((first, second) => first.lobbyOrder - second.lobbyOrder);

  return (["gold", "silver"] as const).flatMap((medal) =>
    completedMatches.map((match) => {
      const winningSide = match.result === "team_a" ? "a" : "b";
      const teamSide =
        medal === "gold"
          ? winningSide
          : winningSide === "a"
            ? "b"
            : "a";
      return {
        matchId: match.id,
        lobbyName: match.lobbyName,
        teamName:
          teamSide === "a" ? match.teamAName : match.teamBName,
        medal,
        players: match.participants.filter(
          (player) => player.teamSide === teamSide,
        ),
      };
    }),
  );
}

export function validateSeasonFinalMatch({
  result,
  roundKind,
  status,
  teamAPlayerIds,
  teamBPlayerIds,
}: {
  result: SeasonFinalMatch["result"];
  roundKind: "regular" | "finals";
  status: SeasonFinalMatch["status"];
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
}) {
  if (roundKind !== "finals" || status !== "completed") return "";
  if (
    teamAPlayerIds.length !== 5 ||
    teamBPlayerIds.length !== 5 ||
    !result ||
    result === "draw"
  ) {
    return "В финале должно быть по 5 игроков в каждой команде и победитель";
  }
  return "";
}
