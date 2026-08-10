import {
  findGameModeWin,
  findRankedStatWin,
  scanCumulativeRankedWinStat,
  scanDistinctMatchingWins,
  scanWinningBuildingDamage,
} from "./matches";
import type { StarRaceQuestRequirement } from "./star-race";
import type { MatchingWin, OpenDotaMatch } from "./types";

export type StarRaceRequirementEvaluation = {
  isComplete: boolean;
  progress: number;
  wins: MatchingWin[];
};

export function evaluateStarRaceRequirement(input: {
  requirement: StarRaceQuestRequirement;
  matches: OpenDotaMatch[];
  dayStart: Date;
  dayEnd: Date;
  now: Date;
}): StarRaceRequirementEvaluation {
  const sharedWindow = {
    matches: input.matches,
    dayStart: input.dayStart,
    dayEnd: input.dayEnd,
    now: input.now,
  };
  const requirement = input.requirement;
  if (requirement.kind === "distinct-hero-wins") {
    const wins = scanDistinctMatchingWins({
      ...sharedWindow,
      heroIds: requirement.heroIds,
    });
    return {
      isComplete: wins.length >= requirement.requiredDistinctWins,
      progress: wins.length,
      wins,
    };
  }
  if (requirement.kind === "winning-building-damage") {
    const scan = scanWinningBuildingDamage(sharedWindow);
    return {
      isComplete: scan.totalDamage >= requirement.targetDamage,
      progress: scan.totalDamage,
      wins: scan.wins,
    };
  }
  if (requirement.kind === "cumulative-ranked-win-stat") {
    const scan = scanCumulativeRankedWinStat({
      ...sharedWindow,
      heroIds: requirement.heroIds,
      stat: requirement.stat,
    });
    return {
      isComplete: scan.total >= requirement.target,
      progress: scan.total,
      wins: scan.wins,
    };
  }
  if (requirement.kind === "ranked-win-stat") {
    const win = findRankedStatWin({
      ...sharedWindow,
      heroIds: requirement.heroIds,
      stat: requirement.stat,
      minimum: requirement.minimum,
    });
    return {
      isComplete: win !== null,
      progress: win ? requirement.minimum : 0,
      wins: win ? [win] : [],
    };
  }
  const win = findGameModeWin({
    ...sharedWindow,
    gameMode: requirement.gameMode,
  });
  return {
    isComplete: win !== null,
    progress: win ? 1 : 0,
    wins: win ? [win] : [],
  };
}
