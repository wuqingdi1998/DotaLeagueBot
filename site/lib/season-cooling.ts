import { seasonExclusionStrikes, seasonPenaltyLimit } from "./season-discipline";

export const seasonCoolingRoundLimit = 3;
export const seasonCoolingFloors = Array.from(
  { length: seasonExclusionStrikes },
  (_, index) => index * seasonPenaltyLimit,
);

export function isSeasonCoolingRoundReady(
  status: string,
  matchCount: number,
  completedMatchCount: number,
): boolean {
  return status === "completed" && matchCount > 0 && completedMatchCount === matchCount;
}

export type SeasonCoolingRound = {
  roundNumber: number;
  isCompleted: boolean;
};

export type SeasonCoolingEvent = {
  roundNumber: number;
  fires: number;
};

export type SeasonCoolingState = {
  progress: number;
  pendingRoundNumber: number | null;
  appliedRoundNumbers: number[];
  invalidRoundNumbers: number[];
  remainingFires: number;
};

/** Replays completed rounds so a late penalty also reverses an invalid approval. */
export function calculateSeasonCooling(
  rounds: SeasonCoolingRound[],
  events: SeasonCoolingEvent[],
  approvedRoundNumbers: number[],
): SeasonCoolingState {
  const firesByRound = new Map<number, number>();
  for (const event of events) {
    firesByRound.set(
      event.roundNumber,
      (firesByRound.get(event.roundNumber) ?? 0) + Math.max(0, Math.trunc(event.fires)),
    );
  }
  const approvals = new Set(approvedRoundNumbers);
  const appliedRoundNumbers: number[] = [];
  let remainingFires = 0;
  let progress = 0;
  let pendingRoundNumber: number | null = null;

  for (const round of [...rounds].sort((left, right) => left.roundNumber - right.roundNumber)) {
    const fires = firesByRound.get(round.roundNumber) ?? 0;
    if (fires > 0) {
      remainingFires += fires;
      progress = 0;
      pendingRoundNumber = null;
      continue;
    }
    const coolingFloor = Math.min(
      seasonCoolingFloors[seasonCoolingFloors.length - 1],
      Math.floor(remainingFires / seasonPenaltyLimit) * seasonPenaltyLimit,
    );
    if (!round.isCompleted || remainingFires <= coolingFloor || pendingRoundNumber !== null) {
      continue;
    }
    progress += 1;
    if (progress < seasonCoolingRoundLimit) continue;
    if (approvals.has(round.roundNumber)) {
      remainingFires -= 1;
      appliedRoundNumbers.push(round.roundNumber);
      progress = 0;
    } else {
      pendingRoundNumber = round.roundNumber;
    }
  }

  return {
    progress,
    pendingRoundNumber,
    appliedRoundNumbers,
    invalidRoundNumbers: approvedRoundNumbers.filter(
      (roundNumber) => !appliedRoundNumbers.includes(roundNumber),
    ),
    remainingFires,
  };
}
