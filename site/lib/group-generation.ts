import { buildDoubleEliminationPlan } from "./postseason-double-elimination";
import { groupSeedLabel } from "./tournament-group-name";
import type { PostseasonMatchPlan } from "./postseason-types";
export type { PostseasonMatchPlan } from "./postseason-types";

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

export const GROUP_TEAM_PLACEHOLDER = "TBA";

export type GroupMatchPlan = {
  round: number;
  slot: number;
  teamAId: number | null;
  teamBId: number | null;
  teamAPlaceholder: string | null;
  teamBPlaceholder: string | null;
};

type RoundRobinSlotMatch = {
  round: number;
  slot: number;
  teamASlot: number;
  teamBSlot: number;
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
  return buildRoundRobinSlotMatches(teamIds.length).map((match) => ({
    round: match.round,
    slot: match.slot,
    teamAId: teamIds[match.teamASlot],
    teamBId: teamIds[match.teamBSlot],
  }));
}

export function buildGroupMatchPlan(
  teamIds: number[],
  groupCapacity: number,
): GroupMatchPlan[] {
  if (!Number.isInteger(groupCapacity) || groupCapacity < 2) return [];

  const participantIds = Array.from(
    { length: groupCapacity },
    (_, index) => teamIds[index] ?? null,
  );
  return buildRoundRobinSlotMatches(groupCapacity).map((match) => {
    const teamAId = participantIds[match.teamASlot];
    const teamBId = participantIds[match.teamBSlot];
    return {
      round: match.round,
      slot: match.slot,
      teamAId,
      teamBId,
      teamAPlaceholder: teamAId === null ? GROUP_TEAM_PLACEHOLDER : null,
      teamBPlaceholder: teamBId === null ? GROUP_TEAM_PLACEHOLDER : null,
    };
  });
}

function buildRoundRobinSlotMatches(
  participantCount: number,
): RoundRobinSlotMatch[] {
  if (participantCount < 2) return [];

  const participants: Array<number | null> = Array.from(
    { length: participantCount },
    (_, index) => index,
  );
  if (participants.length % 2 !== 0) participants.push(null);

  const matches: RoundRobinSlotMatch[] = [];
  for (let round = 1; round < participants.length; round += 1) {
    for (let slot = 0; slot < participants.length / 2; slot += 1) {
      const teamASlot = participants[slot];
      const teamBSlot = participants[participants.length - 1 - slot];
      if (teamASlot !== null && teamBSlot !== null) {
        matches.push({
          round,
          slot: slot + 1,
          teamASlot,
          teamBSlot,
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
  groupAdvancement,
}: {
  groupNames: string[];
  advancingPerGroup: number;
  hasPlayoffStage: boolean;
  playoffType: "single_elimination" | "double_elimination";
  groupAdvancement?: Array<{ advance_to_playoff: number; advance_to_upper: number; advance_to_lower: number }>;
}): PostseasonMatchPlan[] {
  const seedLabels = groupNames.flatMap((groupName, groupIndex) =>
    Array.from(
      { length: Math.max(1, groupAdvancement?.[groupIndex]?.advance_to_playoff ?? advancingPerGroup) },
      (_, index) => groupSeedLabel(groupName, index + 1, groupIndex, groupNames.length),
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

  if (playoffType === "double_elimination") {
    const upper: string[] = [], lower: string[] = [];
    groupNames.forEach((name, groupIndex) => {
      const settings = groupAdvancement?.[groupIndex];
      const upperCount = settings?.advance_to_upper ?? advancingPerGroup;
      const lowerCount = settings?.advance_to_lower ?? 0;
      for (let place = 1; place <= upperCount + lowerCount; place++) {
        (place <= upperCount ? upper : lower).push(groupSeedLabel(name, place, groupIndex, groupNames.length));
      }
    });
    return buildDoubleEliminationPlan(upper, lower);
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
  return buildSingleEliminationMatches(paddedSeeds, roundCount);
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

function nextPowerOfTwo(value: number): number {
  return 2 ** Math.ceil(Math.log2(Math.max(2, value)));
}
