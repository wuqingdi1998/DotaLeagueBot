import { describe, expect, it } from "vitest";
import {
  chooseSeasonLobbyCaptain,
  seasonLobbyDraftFormat,
} from "./season-lobby-room";

describe("season lobby captain voting", () => {
  it("selects the player with the most votes", () => {
    expect(chooseSeasonLobbyCaptain([
      { playerId: "1", voteCount: 2, tier: 9, slotNumber: 1 },
      { playerId: "2", voteCount: 3, tier: 4, slotNumber: 2 },
    ])?.playerId).toBe("2");
  });

  it("resolves an equal vote by the higher tier", () => {
    expect(chooseSeasonLobbyCaptain([
      { playerId: "1", voteCount: 2, tier: 6, slotNumber: 1 },
      { playerId: "2", voteCount: 2, tier: 10, slotNumber: 2 },
    ])?.playerId).toBe("2");
  });

  it("uses the lineup order only when votes and tiers are equal", () => {
    expect(chooseSeasonLobbyCaptain([
      { playerId: "1", voteCount: 2, tier: 8, slotNumber: 2 },
      { playerId: "2", voteCount: 2, tier: 8, slotNumber: 1 },
    ])?.playerId).toBe("2");
  });

  it("supports the formats prepared by Fearless Draft", () => {
    expect(seasonLobbyDraftFormat(1)).toBeNull();
    expect(seasonLobbyDraftFormat(2)).toBe("BO2");
    expect(seasonLobbyDraftFormat(3)).toBe("BO3");
    expect(seasonLobbyDraftFormat(5)).toBeNull();
  });
});
