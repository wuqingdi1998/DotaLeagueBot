import { scanRankedWins } from "./matches";
import { RANKED_LOBBY_TYPES } from "./constants";
import type { FinalRaceStatRequirement } from "./final-race-requirements";
import type { MatchingWin, OpenDotaMatch } from "./types";

export type { FinalRaceStatRequirement } from "./final-race-requirements";

export function evaluateFinalRaceStatistics(input: {
  requirement: FinalRaceStatRequirement; matches: OpenDotaMatch[]; dayStart: Date; dayEnd: Date; now: Date;
}) {
  const eligible = new Map(scanRankedWins(input).map((win) => [win.matchId, win]));
  const wins: MatchingWin[] = [];
  let progress = 0;
  for (const match of input.matches) {
    const win = eligible.get(String(match.match_id));
    if (!win) continue;
    const requirement = input.requirement;
    if (requirement.kind === "cumulative-assists" || requirement.kind === "cumulative-net-worth") {
      const value = match[requirement.kind === "cumulative-assists" ? "assists" : "net_worth"];
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) continue;
      eligible.delete(win.matchId);
      wins.push(win);
      progress += value;
    } else if ((!requirement.isRankedOnly || RANKED_LOBBY_TYPES.has(match.lobby_type)) &&
      requirement.conditions.every(({ stat, minimum, maximum }) => {
        const value = match[stat];
        return typeof value === "number" && Number.isFinite(value) && value >= 0 &&
          (minimum === undefined || value >= minimum) && (maximum === undefined || value <= maximum);
      })) {
      return { isComplete: true, progress: 1, wins: [win] };
    }
  }
  return { isComplete: input.requirement.kind !== "match-stat-win" && progress >= input.requirement.target, progress, wins };
}
