import { describe, expect, it } from "vitest";
import { optimizeSeasonLobbyPlayers } from "./season-lobby-optimization";

function player(index: number, tier: number, primary: number, secondary = primary) {
  return {
    playerId: String(index + 1),
    positions: `${primary}/${secondary}`,
    tierSnapshot: tier,
  };
}

describe("season lobby role optimization", () => {
  it("fills upper-lobby support places with primary supports before core flex players", () => {
    const dedicatedSupports = [4, 4, 5, 5].map((role, index) =>
      player(index, 6, role, role === 4 ? 5 : 4),
    );
    const flexibleCores = Array.from({ length: 4 }, (_, index) =>
      player(index + 4, 9, 2, 4),
    );
    const otherCores = Array.from({ length: 12 }, (_, index) =>
      player(index + 8, index < 8 ? 10 : 4, (index % 3) + 1),
    );

    const plan = optimizeSeasonLobbyPlayers(
      [...dedicatedSupports, ...flexibleCores, ...otherCores],
      2,
    );
    const upper = plan.lobbies[0].placements;

    expect(upper).toHaveLength(10);
    expect(upper.filter(({ primaryRole }) => primaryRole === 4 || primaryRole === 5))
      .toHaveLength(4);
    expect(upper.filter(({ playerId }) => flexibleCores.some(
      (core) => core.playerId === playerId,
    )).every(({ slotNumber }) => slotNumber <= 3)).toBe(true);
  });

  it("never assigns a dedicated support to a core position even when roles are scarce", () => {
    const players = [
      ...Array.from({ length: 5 }, (_, index) =>
        player(index, 8, index < 2 ? 4 : 5, index < 2 ? 5 : 4),
      ),
      ...Array.from({ length: 5 }, (_, index) =>
        player(index + 5, 8, (index % 3) + 1),
      ),
    ];

    const [lobby] = optimizeSeasonLobbyPlayers(players, 1).lobbies;

    expect(lobby.placements).toHaveLength(0);
  });

  it("rotates flexible cores back to primary roles using completed-match history", () => {
    const players = [
      player(0, 8, 2, 4),
      player(1, 8, 2, 4),
      ...[1, 1, 2, 3, 3, 4, 5, 5].map((role, index) =>
        player(index + 2, 8, role),
      ),
    ];
    const roleHistory = new Map([
      ["1", { completedMatches: 4, primaryRoleMatches: 4 }],
      ["2", { completedMatches: 4, primaryRoleMatches: 1 }],
    ]);

    const [lobby] = optimizeSeasonLobbyPlayers(players, 1, { roleHistory }).lobbies;
    const recentlyOverusedSupport = lobby.placements.find(
      ({ playerId }) => playerId === "2",
    );
    const underusedSupport = lobby.placements.find(
      ({ playerId }) => playerId === "1",
    );

    expect(recentlyOverusedSupport?.slotNumber).toBe(2);
    expect(underusedSupport?.slotNumber).toBe(4);
  });

  it("rotates repeated support duty instead of assigning one flexible core every round", () => {
    const flexibleCores = [
      player(0, 8, 2, 4),
      player(1, 8, 2, 4),
      player(2, 8, 3, 4),
      player(3, 8, 3, 4),
    ];
    const players = [
      ...flexibleCores,
      player(4, 8, 1),
      player(5, 8, 1),
      player(6, 8, 2, 3),
      player(7, 8, 4),
      player(8, 8, 5),
      player(9, 8, 5),
    ];
    const roleHistory = new Map<string, {
      completedMatches: number;
      primaryRoleMatches: number;
    }>();

    for (let round = 0; round < 8; round += 1) {
      const [lobby] = optimizeSeasonLobbyPlayers(players, 1, { roleHistory }).lobbies;
      expect(lobby.placements).toHaveLength(10);
      for (const placement of lobby.placements) {
        const previous = roleHistory.get(placement.playerId) ?? {
          completedMatches: 0,
          primaryRoleMatches: 0,
        };
        roleHistory.set(placement.playerId, {
          completedMatches: previous.completedMatches + 1,
          primaryRoleMatches: previous.primaryRoleMatches +
            Number(placement.slotNumber === placement.primaryRole),
        });
      }
    }

    const primaryMatches = flexibleCores.map(
      ({ playerId }) => roleHistory.get(playerId)?.primaryRoleMatches ?? 0,
    );
    expect(Math.min(...primaryMatches)).toBeGreaterThanOrEqual(5);
    expect(primaryMatches.reduce((total, count) => total + count, 0))
      .toBeGreaterThanOrEqual(23);
  });
});
