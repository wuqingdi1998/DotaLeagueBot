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

type PlayerWithRoles = SeasonLobbyOptimizationPlayer & {
  primaryRole: number | null;
  secondaryRole: number | null;
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
export const SEASON_LOBBY_SIZE = TEAM_SIZE * 2;
export const MAX_SEASON_LOBBY_COUNT = 4;

/**
 * Fills complete lobbies in registration order and exhaustively chooses the
 * most balanced role assignment inside every group of ten players.
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
  const lobbies = Array.from({ length: lobbyCount }, (_, lobbyIndex) => ({
    placements: balanceLobbyPlayers(
      players.slice(
        lobbyIndex * SEASON_LOBBY_SIZE,
        (lobbyIndex + 1) * SEASON_LOBBY_SIZE,
      ),
    ),
  }));
  return {
    lobbies,
    reservePlayerIds: players
      .slice(assignedCount)
      .map(({ playerId }) => playerId),
  };
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
    for (const left of leftAssignments) {
      for (const right of rightAssignments) {
        const score = assignmentScore(left, right);
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
) {
  const opponentTierGaps = left.placements.map((player, index) =>
    Math.abs(player.tierSnapshot - right.placements[index].tierSnapshot),
  );
  const coreTierDifference = Math.abs(left.coreTier - right.coreTier);
  const supportTierDifference = Math.abs(
    left.supportTier - right.supportTier,
  );
  return [
    Math.max(...opponentTierGaps),
    opponentTierGaps.reduce((sum, gap) => sum + gap, 0),
    Math.max(left.offRoleCount, right.offRoleCount),
    left.offRoleCount + right.offRoleCount,
    Math.abs(left.secondaryRoleCount - right.secondaryRoleCount),
    left.secondaryRoleCount + right.secondaryRoleCount,
    Math.max(coreTierDifference, supportTierDifference),
    coreTierDifference + supportTierDifference,
    Math.abs(left.totalTier - right.totalTier),
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
