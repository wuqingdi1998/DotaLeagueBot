import { describe, expect, it } from "vitest";
import {
  optimizeSeasonLobbyPlayers,
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
  it("fills complete lobbies by registration order and reserves the remainder", () => {
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

  it("places equal-tier primary roles opposite each other", () => {
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
      expect(leftPlayer?.tierSnapshot).toBe(rightPlayer?.tierSnapshot);
    }
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
});
