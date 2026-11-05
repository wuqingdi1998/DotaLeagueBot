import { postseasonMatchKey, type PostseasonMatchPlan, type PostseasonSide } from "./postseason-types";

type Entrant = { label: string; sourceKey?: string; outcome?: "winner" | "loser" };

/** Lower qualifiers enter with one life; every upper loser must enter the lower bracket. */
export function buildDoubleEliminationPlan(upperSeeds: string[], lowerSeeds: string[]): PostseasonMatchPlan[] {
  if (!upperSeeds.length || upperSeeds.length + lowerSeeds.length < 2) return [];
  const matches: PostseasonMatchPlan[] = [];
  const byKey = new Map<string, PostseasonMatchPlan>();
  const drops: Entrant[][] = [];
  let upper = upperSeeds.map((label) => ({ label } as Entrant));
  let lower = lowerSeeds.map((label) => ({ label } as Entrant));
  let lowerRound = 0;

  function addMatch(a: Entrant, b: Entrant, side: PostseasonSide, round: number, slot: number) {
    const sideLabel = side === "upper" ? "верхней" : "нижней";
    const plan: PostseasonMatchPlan = {
      stage: side === "grand_final" ? "Гранд-финал" : `${side === "upper" ? "Верхняя" : "Нижняя"} сетка · Раунд ${round}`,
      bracketSide: side, bracketRound: round, bracketSlot: slot,
      teamAPlaceholder: a.label, teamBPlaceholder: b.label,
    };
    const key = postseasonMatchKey(plan);
    for (const [entrant, targetSlot] of [[a, "a"], [b, "b"]] as const) {
      if (entrant.sourceKey && entrant.outcome) {
        const source = byKey.get(entrant.sourceKey)!;
        source[entrant.outcome === "winner" ? "winnerTo" : "loserTo"] = { matchKey: key, slot: targetSlot };
      }
    }
    matches.push(plan); byKey.set(key, plan);
    return {
      winner: { label: `Победитель ${sideLabel} сетки · раунд ${round}, матч ${slot}`, sourceKey: key, outcome: "winner" } as Entrant,
      loser: { label: `Проигравший ${sideLabel} сетки · раунд ${round}, матч ${slot}`, sourceKey: key, outcome: "loser" } as Entrant,
    };
  }

  function playRound(entrants: Entrant[], side: "upper" | "lower", round: number) {
    const winners: Entrant[] = [], losers: Entrant[] = [];
    for (let i = 0; i < entrants.length; i += 2) {
      if (!entrants[i + 1]) { winners.push(entrants[i]); continue; }
      const result = addMatch(entrants[i], entrants[i + 1], side, round, i / 2 + 1);
      winners.push(result.winner); losers.push(result.loser);
    }
    return { winners, losers };
  }

  for (let round = 1; upper.length > 1; round++) {
    const result = playRound(upper, "upper", round);
    upper = result.winners; drops.push(result.losers);
  }
  for (const losers of drops) {
    while (lower.length > Math.max(1, losers.length)) {
      lower = playRound(lower, "lower", ++lowerRound).winners;
    }
    const entrants = Array.from({ length: Math.max(lower.length, losers.length) }, (_, i) =>
      [lower[i], losers[i]].filter((entrant): entrant is Entrant => Boolean(entrant)),
    ).flat();
    lower = entrants.length > 1 ? playRound(entrants, "lower", ++lowerRound).winners : entrants;
  }
  while (lower.length > 1) lower = playRound(lower, "lower", ++lowerRound).winners;
  if (lower[0]) addMatch(upper[0], lower[0], "grand_final", 1, 1);
  return matches;
}
