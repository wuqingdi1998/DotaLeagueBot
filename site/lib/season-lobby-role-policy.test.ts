import { describe, expect, it } from "vitest";
import {
  canFillSeasonLobbyRole,
  primaryRoleShortfall,
  seasonLobbyRoleBurden,
} from "./season-lobby-role-policy";

describe("season lobby role policy", () => {
  it("keeps a 5/4 support away from every core slot", () => {
    const dedicatedSupport = { primaryRole: 5, secondaryRole: 4 };
    expect([1, 2, 3].every((slot) =>
      !canFillSeasonLobbyRole(dedicatedSupport, slot),
    )).toBe(true);
    expect(canFillSeasonLobbyRole(dedicatedSupport, 4)).toBe(true);
    expect(canFillSeasonLobbyRole(dedicatedSupport, 5)).toBe(true);
  });

  it("allows cross-category flex players only on their declared slots", () => {
    const flexibleMid = { primaryRole: 2, secondaryRole: 4 };
    expect(canFillSeasonLobbyRole(flexibleMid, 2)).toBe(true);
    expect(canFillSeasonLobbyRole(flexibleMid, 4)).toBe(true);
    expect(canFillSeasonLobbyRole(flexibleMid, 1)).toBe(false);
    expect(canFillSeasonLobbyRole(flexibleMid, 5)).toBe(false);
  });

  it("prioritizes the player furthest below seventy percent on primary", () => {
    const deficient = { completedMatches: 5, primaryRoleMatches: 2 };
    const stable = { completedMatches: 5, primaryRoleMatches: 5 };
    expect(primaryRoleShortfall(deficient, false)).toBeGreaterThan(
      primaryRoleShortfall(deficient, true),
    );
    expect(primaryRoleShortfall(stable, false)).toBe(0);
  });

  it("treats undeclared core swaps and stronger displaced players as bigger losses", () => {
    const core = { primaryRole: 1, secondaryRole: 2, tierSnapshot: 9 };
    const weakerCore = { ...core, tierSnapshot: 5 };

    expect(seasonLobbyRoleBurden(core, 1)).toBe(0);
    expect(seasonLobbyRoleBurden(core, 3)).toBeGreaterThan(
      seasonLobbyRoleBurden(core, 2),
    );
    expect(seasonLobbyRoleBurden(core, 3)).toBeGreaterThan(
      seasonLobbyRoleBurden(weakerCore, 3),
    );
    expect(seasonLobbyRoleBurden(
      { primaryRole: 2, secondaryRole: 4, tierSnapshot: 9 }, 4,
    )).toBeGreaterThan(seasonLobbyRoleBurden(core, 2));
  });
});
