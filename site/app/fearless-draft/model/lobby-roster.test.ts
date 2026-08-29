import { describe, expect, it } from "vitest";
import type { DraftLobbyPlayer } from "./snapshot";
import { draftLobbyTeamForCaptain } from "./lobby-roster";

const players: DraftLobbyPlayer[] = [
  { id: "a1", dotaId: "1", name: "A1", avatarUrl: null, teamSide: "a", isOnline: true, slotNumber: 2 },
  { id: "b1", dotaId: "2", name: "B1", avatarUrl: null, teamSide: "b", isOnline: true, slotNumber: 4 },
  { id: "a2", dotaId: "3", name: "A2", avatarUrl: null, teamSide: "a", isOnline: false, slotNumber: 1 },
  { id: "b2", dotaId: "4", name: "B2", avatarUrl: null, teamSide: "b", isOnline: false, slotNumber: 1 },
];

describe("season lobby roster placement", () => {
  it("places the captain's full team on the captain's current draft side", () => {
    expect(draftLobbyTeamForCaptain(players, "b1").map((player) => player.id))
      .toEqual(["b1", "b2"]);
    expect(draftLobbyTeamForCaptain(players, "a1").map((player) => player.id))
      .toEqual(["a1", "a2"]);
  });

  it("keeps the captain first even when their room slot is later", () => {
    expect(draftLobbyTeamForCaptain(players, "b1").map((player) => player.id))
      .toEqual(["b1", "b2"]);
  });

  it("does not guess a team when the captain is absent", () => {
    expect(draftLobbyTeamForCaptain(players, "missing")).toEqual([]);
  });
});
