import type { SeasonLobbyOptimizationVariant } from "./season-lobby-variants";

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
): number[] | null {
  const totalTierDifference = Math.abs(left.totalTier - right.totalTier);
  const coreTierDifference = Math.abs(left.coreTier - right.coreTier);
  const supportTierDifference = Math.abs(
    left.supportTier - right.supportTier,
  );
  if (
    options.variant === "challenge" &&
    (totalTierDifference > MAX_SEASON_TEAM_TIER_DIFFERENCE ||
      coreTierDifference > 2)
  ) {
    return null;
  }
  if (options.variant === "challenge") {
    return [
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
  const lowerBurden = Math.min(
    left.forcedCoreRoleBurden,
    right.forcedCoreRoleBurden,
  );
  const higherBurden = Math.max(
    left.forcedCoreRoleBurden,
    right.forcedCoreRoleBurden,
  );
  return higherBurden <= lowerBurden * 1.5 + 2;
}
