export type SeasonPenaltyEvent = {
  roundNumber: number;
  fires: number;
};

export type SeasonPenaltyState = {
  totalFires: number;
  strikes: number;
  remainder: number;
  stages: Array<number | null>;
  suspendedRoundNumbers: number[];
  pointAdjustment: number;
  isExcluded: boolean;
};

export const seasonPenaltyLimit = 5;
export const seasonExclusionStrikes = 4;

export function calculateSeasonPenalty(
  events: SeasonPenaltyEvent[],
  regularRoundNumbers: number[],
): SeasonPenaltyState {
  const orderedRounds = [...new Set(regularRoundNumbers)].sort(
    (left, right) => left - right,
  );
  const orderedEvents = [...events].sort(
    (left, right) => left.roundNumber - right.roundNumber,
  );
  let totalFires = 0;
  let previousStrikes = 0;
  const suspendedRounds = new Set<number>();

  for (const event of orderedEvents) {
    totalFires = Math.max(0, totalFires + Math.trunc(event.fires));
    const nextStrikes = Math.min(
      seasonExclusionStrikes,
      Math.floor(totalFires / seasonPenaltyLimit),
    );
    if (nextStrikes > previousStrikes) {
      const newStrikes = nextStrikes - previousStrikes;
      const availableRounds = orderedRounds.filter(
        (roundNumber) =>
          roundNumber > event.roundNumber && !suspendedRounds.has(roundNumber),
      );
      availableRounds
        .slice(0, newStrikes)
        .forEach((roundNumber) => suspendedRounds.add(roundNumber));
    }
    previousStrikes = Math.max(previousStrikes, nextStrikes);
  }

  const strikes = previousStrikes;
  const remainder =
    strikes >= seasonExclusionStrikes
      ? 0
      : totalFires % seasonPenaltyLimit;
  const currentFilledStages = Math.floor(totalFires / seasonPenaltyLimit);
  const visibleRemainder = totalFires % seasonPenaltyLimit;
  const stages = Array.from({ length: seasonExclusionStrikes }, (_, index) => {
    if (index < currentFilledStages) return seasonPenaltyLimit;
    if (index === currentFilledStages && currentFilledStages < seasonExclusionStrikes) {
      return visibleRemainder;
    }
    return null;
  });

  return {
    totalFires,
    strikes,
    remainder,
    stages,
    suspendedRoundNumbers: [...suspendedRounds],
    pointAdjustment: -strikes,
    isExcluded: strikes >= seasonExclusionStrikes,
  };
}
