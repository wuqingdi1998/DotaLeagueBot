export function parseGroupCount(value: unknown): number | null {
  const groupCount = Number(value ?? 2);
  if (
    !Number.isInteger(groupCount) ||
    groupCount < 1 ||
    groupCount > 8
  ) {
    return null;
  }
  return groupCount;
}

export type GroupCapacity = {
  id: number;
  capacity: number;
};

export type GroupAssignment = {
  groupId: number;
  teamId: number;
  sortOrder: number;
};

export type RoundRobinMatch = {
  round: number;
  slot: number;
  teamAId: number;
  teamBId: number;
};

export type PostseasonMatchPlan = {
  stage: string;
  bracketSide: "upper" | "lower" | "grand_final";
  bracketRound: number;
  bracketSlot: number;
  teamAPlaceholder: string;
  teamBPlaceholder: string;
};

export function buildSerpentineAssignments(
  teamIds: number[],
  groups: GroupCapacity[],
): GroupAssignment[] {
  if (!groups.length) return [];

  const maxCapacity = Math.max(...groups.map(({ capacity }) => capacity));
  const availableSlots = Array.from(
    { length: maxCapacity },
    (_, round) => {
      const groupsWithSpace = groups.filter(({ capacity }) => capacity > round);
      return round % 2 === 0
        ? groupsWithSpace
        : groupsWithSpace.toReversed();
    },
  ).flat();

  return teamIds.slice(0, availableSlots.length).map((teamId, index) => {
    const group = availableSlots[index];
    const sortOrder = availableSlots
      .slice(0, index)
      .filter(({ id }) => id === group.id).length;
    return { groupId: group.id, teamId, sortOrder };
  });
}

export function shuffleTeamIds(
  teamIds: number[],
  random: () => number = Math.random,
): number[] {
  const shuffled = [...teamIds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [
      shuffled[target],
      shuffled[index],
    ];
  }
  return shuffled;
}

export function buildRoundRobinMatches(teamIds: number[]): RoundRobinMatch[] {
  if (teamIds.length < 2) return [];

  const participants: Array<number | null> = [...teamIds];
  if (participants.length % 2 !== 0) participants.push(null);

  const matches: RoundRobinMatch[] = [];
  for (let round = 1; round < participants.length; round += 1) {
    for (let slot = 0; slot < participants.length / 2; slot += 1) {
      const teamAId = participants[slot];
      const teamBId = participants[participants.length - 1 - slot];
      if (teamAId !== null && teamBId !== null) {
        matches.push({
          round,
          slot: slot + 1,
          teamAId,
          teamBId,
        });
      }
    }
    const last = participants.pop();
    participants.splice(1, 0, last ?? null);
  }
  return matches;
}

export function parseBestOf(value: string, fallback = 1): number {
  const parsed = Number(value.match(/\bBO\s*([1235])\b/i)?.[1]);
  return [1, 2, 3, 5].includes(parsed) ? parsed : fallback;
}

export function buildPostseasonMatches({
  groupNames,
  advancingPerGroup,
  hasPlayoffStage,
  playoffType,
}: {
  groupNames: string[];
  advancingPerGroup: number;
  hasPlayoffStage: boolean;
  playoffType: "single_elimination" | "double_elimination";
}): PostseasonMatchPlan[] {
  const seedLabels = groupNames.flatMap((groupName) =>
    Array.from(
      { length: Math.max(1, advancingPerGroup) },
      (_, index) => `${index + 1}-е место · ${groupName}`,
    ),
  );
  while (seedLabels.length < 2) {
    seedLabels.push(`Участник финала ${seedLabels.length + 1}`);
  }

  if (!hasPlayoffStage) {
    return [
      {
        stage: "Гранд-финал",
        bracketSide: "grand_final",
        bracketRound: 1,
        bracketSlot: 1,
        teamAPlaceholder: seedLabels[0],
        teamBPlaceholder: seedLabels[1],
      },
    ];
  }

  const bracketSize = nextPowerOfTwo(seedLabels.length);
  const paddedSeeds = [
    ...seedLabels,
    ...Array.from(
      { length: bracketSize - seedLabels.length },
      (_, index) => `Свободный слот ${index + 1}`,
    ),
  ];
  const roundCount = Math.log2(bracketSize);
  if (playoffType === "single_elimination" || roundCount === 1) {
    return buildSingleEliminationMatches(paddedSeeds, roundCount);
  }
  return buildDoubleEliminationMatches(paddedSeeds, roundCount);
}

function buildSingleEliminationMatches(
  seeds: string[],
  roundCount: number,
): PostseasonMatchPlan[] {
  const matches: PostseasonMatchPlan[] = [];
  for (let round = 1; round <= roundCount; round += 1) {
    const matchCount = seeds.length / 2 ** round;
    for (let slot = 1; slot <= matchCount; slot += 1) {
      const isFinal = round === roundCount;
      matches.push({
        stage: isFinal ? "Гранд-финал" : `Плей-офф · Раунд ${round}`,
        bracketSide: isFinal ? "grand_final" : "upper",
        bracketRound: round,
        bracketSlot: slot,
        teamAPlaceholder:
          round === 1
            ? seeds[(slot - 1) * 2]
            : `Победитель раунда ${round - 1} · матч ${slot * 2 - 1}`,
        teamBPlaceholder:
          round === 1
            ? seeds[(slot - 1) * 2 + 1]
            : `Победитель раунда ${round - 1} · матч ${slot * 2}`,
      });
    }
  }
  return matches;
}

function buildDoubleEliminationMatches(
  seeds: string[],
  roundCount: number,
): PostseasonMatchPlan[] {
  const matches: PostseasonMatchPlan[] = [];
  for (let round = 1; round <= roundCount; round += 1) {
    const matchCount = seeds.length / 2 ** round;
    for (let slot = 1; slot <= matchCount; slot += 1) {
      matches.push({
        stage: `Верхняя сетка · Раунд ${round}`,
        bracketSide: "upper",
        bracketRound: round,
        bracketSlot: slot,
        teamAPlaceholder:
          round === 1
            ? seeds[(slot - 1) * 2]
            : `Победитель верхней сетки · раунд ${round - 1}`,
        teamBPlaceholder:
          round === 1
            ? seeds[(slot - 1) * 2 + 1]
            : `Победитель верхней сетки · раунд ${round - 1}`,
      });
    }
  }

  for (let round = 1; round <= (roundCount - 1) * 2; round += 1) {
    const matchCount = Math.max(
      1,
      seeds.length / 2 ** (Math.floor((round + 1) / 2) + 1),
    );
    for (let slot = 1; slot <= matchCount; slot += 1) {
      matches.push({
        stage: `Нижняя сетка · Раунд ${round}`,
        bracketSide: "lower",
        bracketRound: round,
        bracketSlot: slot,
        teamAPlaceholder: `Участник нижней сетки · ${round}.${slot}.A`,
        teamBPlaceholder: `Участник нижней сетки · ${round}.${slot}.B`,
      });
    }
  }

  matches.push({
    stage: "Гранд-финал",
    bracketSide: "grand_final",
    bracketRound: 1,
    bracketSlot: 1,
    teamAPlaceholder: "Победитель верхней сетки",
    teamBPlaceholder: "Победитель нижней сетки",
  });
  return matches;
}

function nextPowerOfTwo(value: number): number {
  return 2 ** Math.ceil(Math.log2(Math.max(2, value)));
}
