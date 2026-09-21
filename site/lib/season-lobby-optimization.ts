import {
  canFillSeasonLobbyRole,
  primaryRoleShortfall,
  seasonLobbyRoleBurden,
  type SeasonLobbyRoleHistory,
} from "./season-lobby-role-policy";
import {
  assignmentScore,
  isFairOptimalAssignment,
} from "./season-lobby-assignment-score";
import { optimalSeasonLobbyVariantIndex } from "./season-lobby-variants";
import type { SeasonLobbyOptimizationVariant } from "./season-lobby-variants";

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

export { SEASON_LOBBY_OPTIMIZATION_VARIANTS } from "./season-lobby-variants";
export type { SeasonLobbyOptimizationVariant } from "./season-lobby-variants";

export type SeasonLobbyOptimizationOptions = {
  recentTeammatePairs?: ReadonlySet<string>;
  roleHistory?: ReadonlyMap<string, SeasonLobbyRoleHistory>;
  variant?: SeasonLobbyOptimizationVariant;
};

type SeasonLobbyTierSortablePlacement = {
  playerId: string;
  slotNumber: number;
  tierSnapshot: number;
};

type PlayerWithRoles = SeasonLobbyOptimizationPlayer & {
  primaryRole: number | null;
  secondaryRole: number | null;
  roleHistory?: SeasonLobbyRoleHistory;
};

type RankedLobbyPlayer = {
  player: SeasonLobbyOptimizationPlayer;
  registrationIndex: number;
};

type TeamRoleAssignment = {
  coreRoleBurden: number;
  coreTier: number;
  forcedCoreRoleBurden: number;
  offRoleCount: number;
  placements: PlayerWithRoles[];
  primaryRoleShortfall: number;
  secondaryRoleCount: number;
  supportRoleBurden: number;
  supportTier: number;
  totalTier: number;
};

type LobbyTeamCandidate = {
  left: TeamRoleAssignment;
  right: TeamRoleAssignment;
  score: number[];
};

const TEAM_SIZE = 5;
const LOBBY_SUPPORT_COUNT = 4;
export const SEASON_LOBBY_SIZE = TEAM_SIZE * 2;
export const MAX_SEASON_LOBBY_COUNT = 4;
export { MAX_SEASON_TEAM_TIER_DIFFERENCE } from "./season-lobby-assignment-score";

/**
 * Keeps the earliest complete registration groups eligible, applies the
 * selected lobby strategy, then balances teams and roles inside every lobby.
 */
export function optimizeSeasonLobbyPlayers(
  players: SeasonLobbyOptimizationPlayer[],
  maxLobbyCount: number,
  options: SeasonLobbyOptimizationOptions = {},
): SeasonLobbyOptimizationPlan {
  const lobbyCount = Math.min(
    Math.max(0, Math.floor(maxLobbyCount)),
    Math.floor(players.length / SEASON_LOBBY_SIZE),
  );
  const assignedCount = lobbyCount * SEASON_LOBBY_SIZE;
  const eligiblePlayers = players.slice(0, assignedCount);
  const variant = options.variant ?? "optimal";
  const lobbyGroups = variant === "challenge"
    ? seedChallengeLobbyGroups(eligiblePlayers, lobbyCount)
    : seedSeasonLobbyGroups(
      eligiblePlayers,
      lobbyCount,
      optimalSeasonLobbyVariantIndex(variant) >= 0,
    );
  const lobbies = lobbyGroups.map((lobbyPlayers) => ({
    placements: balanceLobbyPlayers(lobbyPlayers, {
      recentTeammatePairs: options.recentTeammatePairs ?? new Set<string>(),
      roleHistory: options.roleHistory ?? new Map(),
      variant,
    }),
  }));
  return {
    lobbies,
    reservePlayerIds: players
      .slice(assignedCount)
      .map(({ playerId }) => playerId),
  };
}

function seedChallengeLobbyGroups(
  players: SeasonLobbyOptimizationPlayer[],
  lobbyCount: number,
) {
  const rankedPlayers = players
    .map((player, registrationIndex) => ({ player, registrationIndex }))
    .sort(compareRankedLobbyPlayers);
  const groups = Array.from(
    { length: lobbyCount },
    () => [] as RankedLobbyPlayer[],
  );
  const pairCount = Math.floor(rankedPlayers.length / 2);
  for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
    const lobbyIndex = pairIndex % lobbyCount;
    groups[lobbyIndex].push(
      rankedPlayers[pairIndex],
      rankedPlayers[rankedPlayers.length - pairIndex - 1],
    );
  }
  return groups.map((group) => group.map(({ player }) => player));
}

function seedSeasonLobbyGroups(
  players: SeasonLobbyOptimizationPlayer[],
  lobbyCount: number,
  shouldBalancePrimaryCores: boolean,
) {
  const rankedPlayers = players
    .map((player, registrationIndex) => ({ player, registrationIndex }))
    .sort(compareRankedLobbyPlayers);
  const supportPlayers = rankedPlayers.filter(({ player }) =>
    (parseRoles(player.positions).primaryRole ?? 0) >= 4,
  );
  const otherPlayers = rankedPlayers.filter(
    ({ player }) => (parseRoles(player.positions).primaryRole ?? 0) < 4,
  );

  return Array.from({ length: lobbyCount }, () => {
    const dedicatedSupports = supportPlayers.splice(0, LOBBY_SUPPORT_COUNT);
    const flexibleSupports = otherPlayers
      .filter(({ player }) => isSupportPlayer(player))
      .slice(0, LOBBY_SUPPORT_COUNT - dedicatedSupports.length);
    for (const flexibleSupport of flexibleSupports) {
      otherPlayers.splice(otherPlayers.indexOf(flexibleSupport), 1);
    }
    const remainingCount = SEASON_LOBBY_SIZE -
      dedicatedSupports.length - flexibleSupports.length;
    const corePlayers = shouldBalancePrimaryCores
      ? selectPrimaryCorePlayers(otherPlayers, remainingCount)
      : otherPlayers.splice(0, remainingCount);
    const lobbyPlayers = [
      ...dedicatedSupports,
      ...flexibleSupports,
      ...corePlayers,
    ];
    while (lobbyPlayers.length < SEASON_LOBBY_SIZE) {
      const strongestRemaining = [supportPlayers[0], otherPlayers[0]]
        .filter((entry): entry is RankedLobbyPlayer => Boolean(entry))
        .sort(compareRankedLobbyPlayers)[0];
      if (!strongestRemaining) break;
      const source = supportPlayers[0] === strongestRemaining
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

function selectPrimaryCorePlayers(
  availablePlayers: RankedLobbyPlayer[],
  count: number,
): RankedLobbyPlayer[] {
  const selected: RankedLobbyPlayer[] = [];
  for (let role = 1; role <= 3; role += 1) {
    for (let place = 0; place < 2; place += 1) {
      if (selected.length >= count) break;
      const index = availablePlayers.findIndex(({ player }) =>
        parseRoles(player.positions).primaryRole === role,
      );
      if (index >= 0) selected.push(...availablePlayers.splice(index, 1));
    }
  }
  return [...selected, ...availablePlayers.splice(0, count - selected.length)];
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
  options: Required<SeasonLobbyOptimizationOptions>,
): SeasonLobbyOptimizedPlacement[] {
  const playersWithRoles = players.map((player) => ({
    ...player,
    ...parseRoles(player.positions),
    roleHistory: options.roleHistory.get(player.playerId),
  }));
  const candidates: LobbyTeamCandidate[] = [];
  const optimalVariantIndex = optimalSeasonLobbyVariantIndex(options.variant);
  let minimumRoleSacrifice: number[] | undefined;
  let hasFairMinimumRoleSacrifice = false;

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
    const repeatedTeammateCount = countRepeatedTeammatePairs(
      leftPlayers,
      rightPlayers,
      options.recentTeammatePairs,
    );
    const teamTierSpreads = [
      teamTierSpread(leftPlayers),
      teamTierSpread(rightPlayers),
    ];
    let bestForTeams: LobbyTeamCandidate | undefined;
    for (const left of leftAssignments) {
      for (const right of rightAssignments) {
        if (optimalVariantIndex >= 0) {
          const roleSacrifice = [
            left.offRoleCount + right.offRoleCount,
            left.secondaryRoleCount + right.secondaryRoleCount,
          ];
          if (!minimumRoleSacrifice ||
              compareScores(roleSacrifice, minimumRoleSacrifice) < 0) {
            minimumRoleSacrifice = roleSacrifice;
            hasFairMinimumRoleSacrifice = false;
          }
          if (!isFairOptimalAssignment(left, right)) continue;
          if (minimumRoleSacrifice &&
              compareScores(roleSacrifice, minimumRoleSacrifice) === 0) {
            hasFairMinimumRoleSacrifice = true;
          }
        }
        const score = assignmentScore(left, right, primaryRoleBalance, {
          repeatedTeammateCount,
          teamTierSpreads,
          variant: options.variant,
        });
        if (
          score &&
          (!bestForTeams || compareScores(score, bestForTeams.score) < 0)
        ) {
          bestForTeams = { left, right, score };
        }
      }
    }
    if (bestForTeams) candidates.push(bestForTeams);
  }

  if (optimalVariantIndex >= 0 && !hasFairMinimumRoleSacrifice) {
    return [];
  }
  candidates.sort((left, right) => compareScores(left.score, right.score));
  const alternativeIndex = Math.max(0, optimalVariantIndex);
  const best = candidates[alternativeIndex];
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
  return permutations(players).flatMap((placements) => {
    let coreRoleBurden = 0;
    let coreTier = 0;
    let forcedCoreRoleBurden = 0;
    let offRoleCount = 0;
    let roleShortfall = 0;
    let secondaryRoleCount = 0;
    let supportTier = 0;
    let supportRoleBurden = 0;
    for (const [index, player] of placements.entries()) {
      const assignedRole = index + 1;
      if (!canFillSeasonLobbyRole(player, assignedRole)) return [];
      roleShortfall += primaryRoleShortfall(
        player.roleHistory,
        assignedRole === player.primaryRole,
      );
      const roleBurden = seasonLobbyRoleBurden(player, assignedRole);
      if (assignedRole <= 3 || (player.primaryRole ?? 6) <= 3) {
        coreRoleBurden += roleBurden;
        if (assignedRole !== player.primaryRole &&
            assignedRole !== player.secondaryRole) {
          forcedCoreRoleBurden += roleBurden;
        }
      } else {
        supportRoleBurden += roleBurden;
      }
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
    return [{
      coreRoleBurden,
      coreTier,
      forcedCoreRoleBurden,
      offRoleCount,
      placements,
      primaryRoleShortfall: roleShortfall,
      secondaryRoleCount,
      supportRoleBurden,
      supportTier,
      totalTier: coreTier + supportTier,
    }];
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

function teamTierSpread(players: PlayerWithRoles[]) {
  const tiers = players.map(({ tierSnapshot }) => tierSnapshot);
  return Math.max(...tiers) - Math.min(...tiers);
}

function countRepeatedTeammatePairs(
  leftPlayers: PlayerWithRoles[],
  rightPlayers: PlayerWithRoles[],
  recentTeammatePairs: ReadonlySet<string>,
) {
  return [leftPlayers, rightPlayers].reduce((total, team) => {
    for (let firstIndex = 0; firstIndex < team.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < team.length;
        secondIndex += 1
      ) {
        if (
          recentTeammatePairs.has(
            seasonLobbyTeammatePairKey(
              team[firstIndex].playerId,
              team[secondIndex].playerId,
            ),
          )
        ) {
          total += 1;
        }
      }
    }
    return total;
  }, 0);
}

export function seasonLobbyTeammatePairKey(
  firstPlayerId: string,
  secondPlayerId: string,
) {
  return [firstPlayerId, secondPlayerId].sort().join(":");
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
