export function historicalMatchOutcomeSummary({
  aliases,
  key,
  matches,
  participant,
}) {
  const identity = key(
    aliases[key(participant.canonical)] ?? participant.canonical,
  );
  const outcomes = matches.flatMap((match) => {
    const playerIdentity = (player) =>
      key(aliases[key(player.canonical)] ?? player.canonical);
    const sideA = match.teamA.some(
      (player) => playerIdentity(player) === identity,
    );
    const sideB = match.teamB.some(
      (player) => playerIdentity(player) === identity,
    );
    if (!sideA && !sideB) return [];
    if (match.result === "draw") return ["draw"];
    if (
      (sideA && match.result === "team_a") ||
      (sideB && match.result === "team_b")
    ) {
      return ["win"];
    }
    return ["loss"];
  });
  return {
    wins: outcomes.filter((value) => value === "win").length,
    draws: outcomes.filter((value) => value === "draw").length,
    losses: outcomes.filter((value) => value === "loss").length,
  };
}
