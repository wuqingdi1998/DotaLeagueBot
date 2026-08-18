import { describe, expect, it } from "vitest";
import { planSeasonLobbySlotDrop } from "./season-lobby-assignment";

const destination = { matchId: 20, teamSide: "b" as const, slotNumber: 3 };

describe("season lobby slot drop", () => {
  it("sends a displaced player to the pool when the dragged player came from it", () => {
    expect(
      planSeasonLobbySlotDrop({
        destination,
        draggedPlayer: { playerId: "1", tierSnapshot: 9 },
        occupiedPlayer: { playerId: "2", tierSnapshot: 7 },
        source: null,
      }),
    ).toEqual([{ ...destination, playerId: "1", tierSnapshot: 9 }]);
  });

  it("swaps players when the dragged player came from another slot", () => {
    const source = { matchId: 10, teamSide: "a" as const, slotNumber: 1 };
    expect(
      planSeasonLobbySlotDrop({
        destination,
        draggedPlayer: { playerId: "1", tierSnapshot: 9 },
        occupiedPlayer: { playerId: "2", tierSnapshot: 7 },
        source,
      }),
    ).toEqual([
      { ...destination, playerId: "1", tierSnapshot: 9 },
      { ...source, playerId: "2", tierSnapshot: 7 },
    ]);
  });

  it("moves a player without adding a second placement when the slot is empty", () => {
    expect(
      planSeasonLobbySlotDrop({
        destination,
        draggedPlayer: { playerId: "1", tierSnapshot: 9 },
        occupiedPlayer: null,
        source: { matchId: 10, teamSide: "a", slotNumber: 1 },
      }),
    ).toEqual([{ ...destination, playerId: "1", tierSnapshot: 9 }]);
  });
});
