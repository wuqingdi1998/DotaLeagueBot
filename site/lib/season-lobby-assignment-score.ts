import { isChallengeSeasonLobbyVariant, type SeasonLobbyOptimizationVariant } from "./season-lobby-variants";

export type SeasonLobbyAssignmentMetrics = {
  coreRoleBurden: number;
  coreTier: number;
  forcedCoreRoleBurden: number;
  offRoleCount: number;
  primaryRoleShortfall: number;
  secondaryRoleCount: number;
  supportRoleBurden: number;
  supportTier: number;
  totalTier: number;
};

export type SeasonLobbyScoreOptions = {
  repeatedTeammateCount: number;
  teamTierSpreads: number[];
  variant: SeasonLobbyOptimizationVariant;
};

export const MAX_SEASON_TEAM_TIER_DIFFERENCE = 1;

export function assignmentScore(
  left: SeasonLobbyAssignmentMetrics,
  right: SeasonLobbyAssignmentMetrics,
  primaryRoleBalance: number[],
  options: SeasonLobbyScoreOptions,
): number[] {
  const totalTierDifference = Math.abs(left.totalTier - right.totalTier);
  const coreTierDifference = Math.abs(left.coreTier - right.coreTier);
  const supportTierDifference = Math.abs(
    left.supportTier - right.supportTier,
  );
  if (isChallengeSeasonLobbyVariant(options.variant)) {
    return [
      Math.max(0, totalTierDifference - MAX_SEASON_TEAM_TIER_DIFFERENCE) +
        Math.max(0, coreTierDifference - 2),
      left.primaryRoleShortfall + right.primaryRoleShortfall,
      left.offRoleCount + right.offRoleCount,
      Math.max(left.offRoleCount, right.offRoleCount),
      ...primaryRoleBalance,
      Math.abs(left.secondaryRoleCount - right.secondaryRoleCount),
      Math.max(left.secondaryRoleCount, right.secondaryRoleCount),
      left.secondaryRoleCount + right.secondaryRoleCount,
      -Math.min(...options.teamTierSpreads),
      -options.teamTierSpreads.reduce((sum, spread) => sum + spread, 0),
      coreTierDifference,
      totalTierDifference,
    ];
  }
  if (options.variant !== "together") {
    return [
      left.offRoleCount + right.offRoleCount,
      left.primaryRoleShortfall + right.primaryRoleShortfall,
      left.secondaryRoleCount + right.secondaryRoleCount,
      forcedCoreRoleImbalance(left, right),
      totalTierDifference > MAX_SEASON_TEAM_TIER_DIFFERENCE
        ? totalTierDifference
        : 0,
      Math.abs(left.coreRoleBurden - right.coreRoleBurden),
      Math.abs(left.supportRoleBurden - right.supportRoleBurden),
      ...primaryRoleBalance,
      Math.max(coreTierDifference, supportTierDifference),
      coreTierDifference + supportTierDifference,
      totalTierDifference,
    ];
  }
  return [
    left.primaryRoleShortfall + right.primaryRoleShortfall,
    left.offRoleCount + right.offRoleCount,
    Math.max(left.offRoleCount, right.offRoleCount),
    totalTierDifference > MAX_SEASON_TEAM_TIER_DIFFERENCE
      ? totalTierDifference
      : 0,
    ...(options.variant === "together"
      ? [options.repeatedTeammateCount]
      : []),
    ...primaryRoleBalance,
    Math.abs(left.secondaryRoleCount - right.secondaryRoleCount),
    Math.max(left.secondaryRoleCount, right.secondaryRoleCount),
    left.secondaryRoleCount + right.secondaryRoleCount,
    Math.max(coreTierDifference, supportTierDifference),
    coreTierDifference + supportTierDifference,
    totalTierDifference,
  ];
}

export function isFairOptimalAssignment(
  left: SeasonLobbyAssignmentMetrics,
  right: SeasonLobbyAssignmentMetrics,
): boolean {
  return forcedCoreRoleImbalance(left, right) === 0;
}

function forcedCoreRoleImbalance(
  left: SeasonLobbyAssignmentMetrics,
  right: SeasonLobbyAssignmentMetrics,
): number {
  const lowerBurden = Math.min(
    left.forcedCoreRoleBurden,
    right.forcedCoreRoleBurden,
  );
  const higherBurden = Math.max(
    left.forcedCoreRoleBurden,
    right.forcedCoreRoleBurden,
  );
  return Math.max(0, higherBurden - lowerBurden * 1.5 - 2);
}
