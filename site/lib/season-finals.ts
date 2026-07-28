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
