import { describe, expect, it } from "vitest";
import { assignmentScore, type SeasonLobbyAssignmentMetrics } from "./season-lobby-assignment-score";
import { optimizeSeasonLobbyPlayers, type SeasonLobbyOptimizedPlacement } from "./season-lobby-optimization";
import { canFillSeasonLobbyRole, primaryRoleShortfall, seasonLobbyRoleBurden } from "./season-lobby-role-policy";
import { OPTIMAL_SEASON_LOBBY_VARIANTS } from "./season-lobby-variants";

function playersFor(roles: number[], tiers = roles.map(() => 8)) {
  return roles.map((role, index) => ({
    playerId: String(index), positions: `${role}/${role}`, tierSnapshot: tiers[index],
  }));
}

function signature(placements: SeasonLobbyOptimizedPlacement[]) {
  return placements.filter(({ teamSide }) => teamSide === "a")
    .map(({ playerId }) => playerId).sort().join(",");
}

function metrics(team: SeasonLobbyOptimizedPlacement[]): SeasonLobbyAssignmentMetrics {
  const result = { coreRoleBurden: 0, coreTier: 0, forcedCoreRoleBurden: 0,
    offRoleCount: 0, primaryRoleShortfall: 0, secondaryRoleCount: 0,
    supportRoleBurden: 0, supportTier: 0, totalTier: 0 };
  for (const player of team) {
    const { primaryRole, secondaryRole, slotNumber, tierSnapshot } = player;
    const burden = seasonLobbyRoleBurden(player, slotNumber);
    const isOffRole = slotNumber !== primaryRole && slotNumber !== secondaryRole;
    if (slotNumber <= 3 || (primaryRole ?? 6) <= 3) {
      result.coreRoleBurden += burden;
      if (isOffRole) result.forcedCoreRoleBurden += burden;
    } else result.supportRoleBurden += burden;
    result.offRoleCount += Number(isOffRole);
    result.secondaryRoleCount += Number(slotNumber !== primaryRole && slotNumber === secondaryRole);
    result.primaryRoleShortfall += primaryRoleShortfall(undefined, slotNumber === primaryRole);
    if (slotNumber <= 3) result.coreTier += tierSnapshot;
    else result.supportTier += tierSnapshot;
    result.totalTier += tierSnapshot;
  }
  return result;
}

function rank(placements: SeasonLobbyOptimizedPlacement[]) {
  const teams = (["a", "b"] as const).map((side) => placements.filter(({ teamSide }) => side === teamSide));
  const gaps = [1, 2, 3, 4, 5].map((role) => Math.abs(
    teams[0].filter(({ primaryRole }) => primaryRole === role).length -
    teams[1].filter(({ primaryRole }) => primaryRole === role).length,
  ));
  return [placements.filter((player) => !canFillSeasonLobbyRole(player, player.slotNumber)).length,
    ...assignmentScore(metrics(teams[0]), metrics(teams[1]),
      [Math.max(...gaps), gaps.reduce((sum, gap) => sum + gap, 0)],
      { variant: "optimal", repeatedTeammateCount: 0, teamTierSpreads: [0, 0] })];
}

describe("ranked lobby alternatives", () => {
  it.each([
    [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
    [1, 1, 1, 2, 3, 3, 4, 4, 5, 5],
    [1, 1, 2, 2, 3, 4, 4, 5, 5, 5],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ])("returns five unique complete plans in nondecreasing quality order: %j", (...roles) => {
    const players = playersFor(roles, [12, 9, 8, 8, 7, 6, 5, 4, 3, 1]);
    const plans = OPTIMAL_SEASON_LOBBY_VARIANTS.map((variant) =>
      optimizeSeasonLobbyPlayers(players, 1, { variant }).lobbies[0].placements);
    expect(new Set(plans.map(signature)).size).toBe(5);
    for (const placements of plans) {
      expect(placements).toHaveLength(10);
      expect(new Set(placements.map(({ playerId }) => playerId)).size).toBe(10);
      expect(new Set(placements.map(({ teamSide, slotNumber }) => `${teamSide}:${slotNumber}`)).size).toBe(10);
    }
    const ranks = plans.map(rank);
    for (let index = 1; index < ranks.length; index++) {
      const firstDifference = ranks[index].findIndex((value, component) => value !== ranks[index - 1][component]);
      if (firstDifference >= 0) expect(ranks[index][firstDifference]).toBeGreaterThan(ranks[index - 1][firstDifference]);
    }
    expect(optimizeSeasonLobbyPlayers(players, 1).lobbies[0].placements).toEqual(plans[0]);
  }, 20_000);

  it.each([false, true])("offers a different challenge ALT with the same rules, impossible balance: %s", (isImpossible) => {
    const players = playersFor([1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
      isImpossible ? [30, 1, 1, 1, 1, 1, 1, 1, 1, 1] : undefined);
    const plans = (["challenge", "challengeAlt"] as const).map((variant) =>
      optimizeSeasonLobbyPlayers(players, 1, { variant }).lobbies[0].placements);
    expect(signature(plans[0])).not.toBe(signature(plans[1]));
    for (const placements of plans) {
      expect(placements).toHaveLength(10);
      expect(placements.every(({ primaryRole, slotNumber }) => primaryRole === slotNumber)).toBe(true);
      const totals = ["a", "b"].map((side) => placements.filter(({ teamSide }) => teamSide === side)
        .reduce((sum, { tierSnapshot }) => sum + tierSnapshot, 0));
      expect(Math.abs(totals[0] - totals[1])).toBe(isImpossible ? 29 : 0);
    }
  });

  it("keeps complete distinct alternatives for four lobbies and reserves late registrations", () => {
    const players = Array.from({ length: 43 }, (_, index) => ({
      playerId: String(index), positions: `${index % 5 + 1}`, tierSnapshot: 12 - Math.floor(index / 5),
    }));
    const plans = OPTIMAL_SEASON_LOBBY_VARIANTS.map((variant) => optimizeSeasonLobbyPlayers(players, 4, { variant }));
    for (const plan of plans) {
      expect(plan.lobbies).toHaveLength(4);
      expect(plan.lobbies.every(({ placements }) => placements.length === 10)).toBe(true);
      expect(new Set(plan.lobbies.flatMap(({ placements }) => placements.map(({ playerId }) => playerId))).size).toBe(40);
      expect(plan.reservePlayerIds).toEqual(["40", "41", "42"]);
    }
    expect(new Set(plans.map((plan) => plan.lobbies.map(({ placements }) => signature(placements)).join("|"))).size).toBe(5);
  });
});
