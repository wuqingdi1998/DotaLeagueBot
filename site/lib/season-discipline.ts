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
    totalFires += Math.max(0, Math.trunc(event.fires));
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
    previousStrikes = nextStrikes;
  }

  const strikes = Math.min(
    seasonExclusionStrikes,
    Math.floor(totalFires / seasonPenaltyLimit),
  );
  const remainder =
    strikes >= seasonExclusionStrikes
      ? 0
      : totalFires % seasonPenaltyLimit;
  const stages = Array.from({ length: seasonExclusionStrikes }, (_, index) => {
    if (index < strikes) return seasonPenaltyLimit;
    if (index === strikes && strikes < seasonExclusionStrikes) return remainder;
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
