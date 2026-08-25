import { describe, expect, it } from "vitest";
import {
  optimizeSeasonLobbyPlayers,
  sortSeasonLobbyTeamByTier,
  type SeasonLobbyOptimizationPlayer,
} from "./season-lobby-optimization";

function player(
  index: number,
  tierSnapshot: number,
  primaryRole: number,
  secondaryRole = primaryRole,
): SeasonLobbyOptimizationPlayer {
  return {
    playerId: String(index + 1),
    positions: `${primaryRole}/${secondaryRole}`,
    tierSnapshot,
  };
}

describe("season lobby optimization", () => {
  it("keeps the earliest complete lobby groups eligible and reserves the remainder", () => {
    const players = Array.from({ length: 25 }, (_, index) =>
      player(index, 12 - (index % 6), (index % 5) + 1),
    );

    const plan = optimizeSeasonLobbyPlayers(players, 4);
    const assignedPlayerIds = plan.lobbies.flatMap((lobby) =>
      lobby.placements.map(({ playerId }) => playerId),
    );

    expect(plan.lobbies).toHaveLength(2);
    expect(new Set(assignedPlayerIds)).toEqual(
      new Set(players.slice(0, 20).map(({ playerId }) => playerId)),
    );
    expect(plan.reservePlayerIds).toEqual(
      players.slice(20).map(({ playerId }) => playerId),
    );
  });

  it("places stronger tiers in the upper lobby regardless of registration order", () => {
    const highTierPlayers = Array.from({ length: 10 }, (_, index) =>
      player(index, 10 - (index % 2), (index % 5) + 1),
    );
    const lowTierPlayers = Array.from({ length: 10 }, (_, index) =>
      player(index + 10, 6 - (index % 2), (index % 5) + 1),
    );
    const players = highTierPlayers.flatMap((highTierPlayer, index) => [
      lowTierPlayers[index],
      highTierPlayer,
    ]);

    const plan = optimizeSeasonLobbyPlayers(players, 2);
    const upperTiers = plan.lobbies[0].placements.map(
      ({ tierSnapshot }) => tierSnapshot,
    );
    const lowerTiers = plan.lobbies[1].placements.map(
      ({ tierSnapshot }) => tierSnapshot,
    );

    expect(Math.min(...upperTiers)).toBeGreaterThanOrEqual(9);
    expect(Math.max(...lowerTiers)).toBeLessThanOrEqual(6);
  });

  it("promotes low-tier supports when the upper lobby lacks positions four and five", () => {
    const highTierCores = [1, 1, 2, 2, 3, 3, 1, 2, 3, 1].map(
      (role, index) => player(index, 10, role),
    );
    const lowTierSupports = [4, 4, 5, 5].map((role, index) =>
      player(index + 10, 6 - Math.floor(index / 2), role),
    );
    const lowTierCores = [1, 1, 2, 2, 3, 3].map((role, index) =>
      player(index + 14, 4, role),
    );

    const plan = optimizeSeasonLobbyPlayers(
      [...highTierCores, ...lowTierSupports, ...lowTierCores],
      2,
    );
    const upperPlayers = plan.lobbies[0].placements;
    const promotedLowTierPlayers = upperPlayers.filter(
      ({ tierSnapshot }) => tierSnapshot <= 6,
    );

    expect(promotedLowTierPlayers).toHaveLength(4);
    expect(
      promotedLowTierPlayers.every(({ primaryRole }) =>
        primaryRole === 4 || primaryRole === 5,
      ),
    ).toBe(true);
    expect(
      upperPlayers.filter(({ primaryRole }) =>
        primaryRole === 4 || primaryRole === 5,
      ),
    ).toHaveLength(4);
  });

  it("keeps primary roles when the total team tiers are already balanced", () => {
    const players = [
      ...Array.from({ length: 5 }, (_, index) =>
        player(index, 10 - index, index + 1),
      ),
      ...Array.from({ length: 5 }, (_, index) =>
        player(index + 5, 10 - index, index + 1),
      ),
    ];

    const [lobby] = optimizeSeasonLobbyPlayers(players, 4).lobbies;
    const left = lobby.placements.filter(({ teamSide }) => teamSide === "a");
    const right = lobby.placements.filter(({ teamSide }) => teamSide === "b");

    for (let slotNumber = 1; slotNumber <= 5; slotNumber += 1) {
      const leftPlayer = left.find((entry) => entry.slotNumber === slotNumber);
      const rightPlayer = right.find((entry) => entry.slotNumber === slotNumber);
      expect(leftPlayer?.primaryRole).toBe(slotNumber);
      expect(rightPlayer?.primaryRole).toBe(slotNumber);
    }
    expect(
      Math.abs(
        left.reduce((sum, player) => sum + player.tierSnapshot, 0) -
          right.reduce((sum, player) => sum + player.tierSnapshot, 0),
      ),
    ).toBeLessThanOrEqual(1);
  });

  it("shares unavoidable secondary roles and balances core and support tiers", () => {
    const players = [
      ...Array.from({ length: 5 }, (_, index) =>
        player(index, 8, index + 1),
      ),
      ...Array.from({ length: 5 }, (_, index) =>
        player(index + 5, 8, 1, index + 1),
      ),
    ];

    const [lobby] = optimizeSeasonLobbyPlayers(players, 4).lobbies;
    const teams = (["a", "b"] as const).map((teamSide) => {
      const placements = lobby.placements.filter(
        (entry) => entry.teamSide === teamSide,
      );
      return {
        coreTier: placements
          .filter(({ slotNumber }) => slotNumber <= 3)
          .reduce((sum, entry) => sum + entry.tierSnapshot, 0),
        secondaryCount: placements.filter(
          ({ primaryRole, secondaryRole, slotNumber }) =>
            slotNumber !== primaryRole && slotNumber === secondaryRole,
        ).length,
        supportTier: placements
          .filter(({ slotNumber }) => slotNumber >= 4)
          .reduce((sum, entry) => sum + entry.tierSnapshot, 0),
      };
    });

    expect(Math.abs(teams[0].secondaryCount - teams[1].secondaryCount)).toBeLessThanOrEqual(1);
    expect(Math.abs(teams[0].coreTier - teams[1].coreTier)).toBeLessThanOrEqual(2);
    expect(Math.abs(teams[0].supportTier - teams[1].supportTier)).toBeLessThanOrEqual(2);
  });

  it("does not sacrifice available roles for closer opponent tiers", () => {
    const players = [
      player(0, 5, 3, 4),
      player(1, 7, 2, 4),
      player(2, 11, 3, 2),
      player(3, 8, 1, 3),
      player(4, 5, 4, 5),
      player(5, 10, 1, 2),
      player(6, 6, 3, 5),
      player(7, 6, 1, 4),
      player(8, 9, 3, 4),
      player(9, 10, 4, 5),
    ];

    const [lobby] = optimizeSeasonLobbyPlayers(players, 1).lobbies;

    expect(lobby.placements).toHaveLength(10);
    for (const placement of lobby.placements) {
      expect([placement.primaryRole, placement.secondaryRole]).toContain(
        placement.slotNumber,
      );
    }
    for (let role = 1; role <= 5; role += 1) {
      const primaryRoleCounts = (["a", "b"] as const).map(
        (teamSide) =>
          lobby.placements.filter(
            (placement) =>
              placement.teamSide === teamSide &&
              placement.primaryRole === role,
          ).length,
      );
      expect(Math.abs(primaryRoleCounts[0] - primaryRoleCounts[1])).toBeLessThanOrEqual(1);
    }
  });

  it("balances total team tiers without limiting opposing player gaps", () => {
    const players = [
      player(0, 1, 1),
      player(1, 4, 2),
      player(2, 7, 3),
      player(3, 8, 4),
      player(4, 9, 5),
      player(5, 3, 1),
      player(6, 1, 2),
      player(7, 8, 3),
      player(8, 3, 4),
      player(9, 12, 5),
    ];

    const [lobby] = optimizeSeasonLobbyPlayers(players, 1).lobbies;
    const teamTiers = (["a", "b"] as const).map((teamSide) =>
      lobby.placements
        .filter((placement) => placement.teamSide === teamSide)
        .reduce((sum, placement) => sum + placement.tierSnapshot, 0),
    );

    expect(Math.abs(teamTiers[0] - teamTiers[1])).toBeLessThanOrEqual(1);
    for (const placement of lobby.placements) {
      expect(placement.slotNumber).toBe(placement.primaryRole);
    }
    const opposingTierGaps = Array.from({ length: 5 }, (_, index) => {
      const slotNumber = index + 1;
      const left = lobby.placements.find(
        (placement) =>
          placement.teamSide === "a" && placement.slotNumber === slotNumber,
      );
      const right = lobby.placements.find(
        (placement) =>
          placement.teamSide === "b" && placement.slotNumber === slotNumber,
      );
      return Math.abs(
        (left?.tierSnapshot ?? 0) - (right?.tierSnapshot ?? 0),
      );
    });
    expect(Math.max(...opposingTierGaps)).toBeGreaterThan(1);
  });

  it("sorts only one team by tier from highest to lowest", () => {
    const sorted = sortSeasonLobbyTeamByTier([
      { playerId: "one", slotNumber: 1, tierSnapshot: 5 },
      { playerId: "two", slotNumber: 2, tierSnapshot: 11 },
      { playerId: "three", slotNumber: 3, tierSnapshot: 8 },
    ]);

    expect(sorted).toEqual([
      { playerId: "two", slotNumber: 1, tierSnapshot: 11 },
      { playerId: "three", slotNumber: 2, tierSnapshot: 8 },
      { playerId: "one", slotNumber: 3, tierSnapshot: 5 },
    ]);
  });
});
