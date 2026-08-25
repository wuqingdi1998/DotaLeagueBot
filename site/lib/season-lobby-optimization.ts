export type SeasonLobbyOptimizationPlayer = {
  playerId: string;
  positions: string | null;
  tierSnapshot: number;
};

export type SeasonLobbyOptimizedPlacement = SeasonLobbyOptimizationPlayer & {
  primaryRole: number | null;
  secondaryRole: number | null;
  slotNumber: number;
  teamSide: "a" | "b";
};

export type SeasonLobbyOptimizationPlan = {
  lobbies: Array<{ placements: SeasonLobbyOptimizedPlacement[] }>;
  reservePlayerIds: string[];
};

type SeasonLobbyTierSortablePlacement = {
  playerId: string;
  slotNumber: number;
  tierSnapshot: number;
};

type PlayerWithRoles = SeasonLobbyOptimizationPlayer & {
  primaryRole: number | null;
  secondaryRole: number | null;
};

type RankedLobbyPlayer = {
  player: SeasonLobbyOptimizationPlayer;
  registrationIndex: number;
};

type TeamRoleAssignment = {
  coreTier: number;
  offRoleCount: number;
  placements: PlayerWithRoles[];
  secondaryRoleCount: number;
  supportTier: number;
  totalTier: number;
};

const TEAM_SIZE = 5;
const LOBBY_SUPPORT_COUNT = 4;
export const SEASON_LOBBY_SIZE = TEAM_SIZE * 2;
export const MAX_SEASON_LOBBY_COUNT = 4;
export const MAX_SEASON_TEAM_TIER_DIFFERENCE = 1;

/**
 * Keeps the earliest complete registration groups eligible, seeds stronger
 * and weaker lobbies, then balances teams and roles inside every lobby.
 */
export function optimizeSeasonLobbyPlayers(
  players: SeasonLobbyOptimizationPlayer[],
  maxLobbyCount: number,
): SeasonLobbyOptimizationPlan {
  const lobbyCount = Math.min(
    Math.max(0, Math.floor(maxLobbyCount)),
    Math.floor(players.length / SEASON_LOBBY_SIZE),
  );
  const assignedCount = lobbyCount * SEASON_LOBBY_SIZE;
  const lobbyGroups = seedSeasonLobbyGroups(
    players.slice(0, assignedCount),
    lobbyCount,
  );
  const lobbies = lobbyGroups.map((lobbyPlayers) => ({
    placements: balanceLobbyPlayers(lobbyPlayers),
  }));
  return {
    lobbies,
    reservePlayerIds: players
      .slice(assignedCount)
      .map(({ playerId }) => playerId),
  };
}

function seedSeasonLobbyGroups(
  players: SeasonLobbyOptimizationPlayer[],
  lobbyCount: number,
) {
  const rankedPlayers = players
    .map((player, registrationIndex) => ({ player, registrationIndex }))
    .sort(compareRankedLobbyPlayers);
  const supportPlayers = rankedPlayers.filter(({ player }) =>
    isSupportPlayer(player),
  );
  const otherPlayers = rankedPlayers.filter(
    ({ player }) => !isSupportPlayer(player),
  );

  return Array.from({ length: lobbyCount }, () => {
    const lobbyPlayers = [
      ...supportPlayers.splice(0, LOBBY_SUPPORT_COUNT),
      ...otherPlayers.splice(0, SEASON_LOBBY_SIZE - LOBBY_SUPPORT_COUNT),
    ];
    while (lobbyPlayers.length < SEASON_LOBBY_SIZE) {
      const strongestRemaining = [supportPlayers[0], otherPlayers[0]]
        .filter((entry): entry is RankedLobbyPlayer => Boolean(entry))
        .sort(compareRankedLobbyPlayers)[0];
      if (!strongestRemaining) break;
      const source = isSupportPlayer(strongestRemaining.player)
        ? supportPlayers
        : otherPlayers;
      const nextPlayer = source.shift();
      if (nextPlayer) lobbyPlayers.push(nextPlayer);
    }
    return lobbyPlayers
      .sort(compareRankedLobbyPlayers)
      .map(({ player }) => player);
  });
}

function compareRankedLobbyPlayers(
  left: RankedLobbyPlayer,
  right: RankedLobbyPlayer,
) {
  return (
    right.player.tierSnapshot - left.player.tierSnapshot ||
    left.registrationIndex - right.registrationIndex
  );
}

function isSupportPlayer(player: SeasonLobbyOptimizationPlayer) {
  const { primaryRole, secondaryRole } = parseRoles(player.positions);
  return [primaryRole, secondaryRole].some(
    (role) => role !== null && role >= 4,
  );
}

export function sortSeasonLobbyTeamByTier<
  Placement extends SeasonLobbyTierSortablePlacement,
>(placements: Placement[]): Placement[] {
  return [...placements]
    .sort(
      (left, right) =>
        right.tierSnapshot - left.tierSnapshot ||
        left.slotNumber - right.slotNumber ||
        left.playerId.localeCompare(right.playerId),
    )
    .map((placement, index) => ({
      ...placement,
      slotNumber: index + 1,
    }));
}

function balanceLobbyPlayers(
  players: SeasonLobbyOptimizationPlayer[],
): SeasonLobbyOptimizedPlacement[] {
  const playersWithRoles = players.map((player) => ({
    ...player,
    ...parseRoles(player.positions),
  }));
  let best:
    | {
        left: TeamRoleAssignment;
        right: TeamRoleAssignment;
        score: number[];
      }
    | undefined;

  for (const leftIndexes of fivePlayerTeamIndexes(playersWithRoles.length)) {
    const leftIndexSet = new Set(leftIndexes);
    const leftPlayers = playersWithRoles.filter((_, index) =>
      leftIndexSet.has(index),
    );
    const rightPlayers = playersWithRoles.filter(
      (_, index) => !leftIndexSet.has(index),
    );
    const leftAssignments = teamRoleAssignments(leftPlayers);
    const rightAssignments = teamRoleAssignments(rightPlayers);
    const primaryRoleBalance = primaryRoleBalanceScore(
      leftPlayers,
      rightPlayers,
    );
    for (const left of leftAssignments) {
      for (const right of rightAssignments) {
        const score = assignmentScore(left, right, primaryRoleBalance);
        if (!best || compareScores(score, best.score) < 0) {
          best = { left, right, score };
        }
      }
    }
  }

  if (!best) return [];
  return [
    ...placementsForSide(best.left, "a"),
    ...placementsForSide(best.right, "b"),
  ];
}

function parseRoles(positions: string | null) {
  const [primary, secondary] = positions?.split("/") ?? [];
  return {
    primaryRole: validRole(primary),
    secondaryRole: validRole(secondary),
  };
}

function validRole(value: string | undefined) {
  const role = Number(value);
  return Number.isInteger(role) && role >= 1 && role <= 5 ? role : null;
}

function fivePlayerTeamIndexes(playerCount: number) {
  const teams: number[][] = [];
  function choose(nextIndex: number, chosen: number[]) {
    if (chosen.length === TEAM_SIZE) {
      teams.push(chosen);
      return;
    }
    const remainingSlots = TEAM_SIZE - chosen.length;
    for (
      let index = nextIndex;
      index <= playerCount - remainingSlots;
      index += 1
    ) {
      choose(index + 1, [...chosen, index]);
    }
  }
  choose(1, [0]);
  return teams;
}

function teamRoleAssignments(players: PlayerWithRoles[]) {
  return permutations(players).map((placements) => {
    let coreTier = 0;
    let offRoleCount = 0;
    let secondaryRoleCount = 0;
    let supportTier = 0;
    for (const [index, player] of placements.entries()) {
      const assignedRole = index + 1;
      if (assignedRole === player.primaryRole) {
        // Primary roles are preferred and need no penalty.
      } else if (assignedRole === player.secondaryRole) {
        secondaryRoleCount += 1;
      } else {
        offRoleCount += 1;
      }
      if (assignedRole <= 3) coreTier += player.tierSnapshot;
      else supportTier += player.tierSnapshot;
    }
    return {
      coreTier,
      offRoleCount,
      placements,
      secondaryRoleCount,
      supportTier,
      totalTier: coreTier + supportTier,
    };
  });
}

function primaryRoleBalanceScore(
  leftPlayers: PlayerWithRoles[],
  rightPlayers: PlayerWithRoles[],
) {
  const roleGaps = Array.from({ length: TEAM_SIZE }, (_, index) => {
    const role = index + 1;
    const leftCount = leftPlayers.filter(
      ({ primaryRole }) => primaryRole === role,
    ).length;
    const rightCount = rightPlayers.filter(
      ({ primaryRole }) => primaryRole === role,
    ).length;
    return Math.abs(leftCount - rightCount);
  });
  return [
    Math.max(...roleGaps),
    roleGaps.reduce((sum, gap) => sum + gap, 0),
  ];
}

function permutations<T>(values: T[]): T[][] {
  if (values.length <= 1) return [values];
  return values.flatMap((value, index) =>
    permutations(values.filter((_, itemIndex) => itemIndex !== index)).map(
      (tail) => [value, ...tail],
    ),
  );
}

function assignmentScore(
  left: TeamRoleAssignment,
  right: TeamRoleAssignment,
  primaryRoleBalance: number[],
) {
  const totalTierDifference = Math.abs(left.totalTier - right.totalTier);
  const coreTierDifference = Math.abs(left.coreTier - right.coreTier);
  const supportTierDifference = Math.abs(
    left.supportTier - right.supportTier,
  );
  return [
    totalTierDifference > MAX_SEASON_TEAM_TIER_DIFFERENCE
      ? totalTierDifference
      : 0,
    left.offRoleCount + right.offRoleCount,
    Math.max(left.offRoleCount, right.offRoleCount),
    ...primaryRoleBalance,
    Math.abs(left.secondaryRoleCount - right.secondaryRoleCount),
    Math.max(left.secondaryRoleCount, right.secondaryRoleCount),
    left.secondaryRoleCount + right.secondaryRoleCount,
    Math.max(coreTierDifference, supportTierDifference),
    coreTierDifference + supportTierDifference,
    totalTierDifference,
  ];
}

function compareScores(left: number[], right: number[]) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function placementsForSide(
  assignment: TeamRoleAssignment,
  teamSide: "a" | "b",
) {
  return assignment.placements.map((player, index) => ({
    ...player,
    slotNumber: index + 1,
    teamSide,
  }));
}
