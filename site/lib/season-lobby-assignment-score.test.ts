import { describe, expect, it } from "vitest";
import {
  assignmentScore,
  isFairOptimalAssignment,
  type SeasonLobbyAssignmentMetrics,
} from "./season-lobby-assignment-score";

function metrics(
  overrides: Partial<SeasonLobbyAssignmentMetrics> = {},
): SeasonLobbyAssignmentMetrics {
  return {
    coreRoleBurden: 0,
    coreTier: 24,
    forcedCoreRoleBurden: 0,
    offRoleCount: 0,
    primaryRoleShortfall: 0,
    secondaryRoleCount: 0,
    supportRoleBurden: 0,
    supportTier: 16,
    totalTier: 40,
    ...overrides,
  };
}

describe("optimal season lobby fairness", () => {
  it("requires comparable forced core-role losses on both sides", () => {
    expect(isFairOptimalAssignment(
      metrics({ forcedCoreRoleBurden: 38 }), metrics(),
    )).toBe(false);
    expect(isFairOptimalAssignment(
      metrics({ forcedCoreRoleBurden: 38 }),
      metrics({ forcedCoreRoleBurden: 30 }),
    )).toBe(true);
  });

  it("ranks similar core-role burden above one-sided secondary-role burden", () => {
    const options = {
      pairHistoryPenalty: [0, 0] as [number, number],
      teamTierSpreads: [3, 3],
      variant: "optimal" as const,
    };
    const uneven = assignmentScore(
      metrics({ coreRoleBurden: 14, secondaryRoleCount: 1 }),
      metrics({ secondaryRoleCount: 1 }),
      [0, 0], options,
    );
    const even = assignmentScore(
      metrics({ coreRoleBurden: 7, secondaryRoleCount: 1 }),
      metrics({ coreRoleBurden: 7, secondaryRoleCount: 1 }),
      [0, 0], options,
    );

    expect(even).not.toBeNull();
    expect(uneven).not.toBeNull();
    expect(even?.[5]).toBeLessThan(uneven?.[5] ?? 0);
  });

  it("ranks teammate frequency before opponent frequency for together mode", () => {
    const common = {
      teamTierSpreads: [3, 3],
      variant: "together" as const,
    };
    const frequentTeammates = assignmentScore(
      metrics(), metrics(), [0, 0],
      { ...common, pairHistoryPenalty: [4, 0] },
    );
    const fewerTeammates = assignmentScore(
      metrics(), metrics(), [0, 0],
      { ...common, pairHistoryPenalty: [2, 8] },
    );
    const fewerOpponents = assignmentScore(
      metrics(), metrics(), [0, 0],
      { ...common, pairHistoryPenalty: [2, 3] },
    );

    expect(fewerTeammates[4]).toBeLessThan(frequentTeammates[4]);
    expect(fewerOpponents[5]).toBeLessThan(fewerTeammates[5]);
  });
});
