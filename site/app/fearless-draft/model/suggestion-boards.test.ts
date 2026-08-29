import { describe, expect, it } from "vitest";
import type { DraftHeroSuggestion } from "./snapshot";
import { buildDraftHeroSuggestionBoards } from "./suggestion-boards";

function suggestion(
  playerId: string,
  playerName: string,
  colorSlot: DraftHeroSuggestion["colorSlot"],
  heroId: number,
): DraftHeroSuggestion {
  return { playerId, playerName, colorSlot, heroId };
}

describe("Fearless Draft suggestion boards", () => {
  it("groups five heroes per player and orders boards by team color slot", () => {
    const suggestions = [
      suggestion("third", "Третий", 3, 31),
      suggestion("first", "Первый", 1, 11),
      suggestion("first", "Первый", 1, 12),
      suggestion("second", "Второй", 2, 21),
    ];

    expect(buildDraftHeroSuggestionBoards(suggestions)).toEqual([
      {
        playerId: "first",
        playerName: "Первый",
        colorSlot: 1,
        heroIds: [11, 12],
      },
      {
        playerId: "second",
        playerName: "Второй",
        colorSlot: 2,
        heroIds: [21],
      },
      {
        playerId: "third",
        playerName: "Третий",
        colorSlot: 3,
        heroIds: [31],
      },
    ]);
  });

  it("never exposes more than five boards or five heroes on one board", () => {
    const suggestions = Array.from({ length: 6 }, (_, index) =>
      suggestion("first", "Первый", 1, index + 1),
    );
    for (let slot = 2; slot <= 5; slot += 1) {
      suggestions.push(suggestion(`player-${slot}`, `Игрок ${slot}`, slot as 2 | 3 | 4 | 5, slot * 10));
    }

    const boards = buildDraftHeroSuggestionBoards(suggestions);

    expect(boards).toHaveLength(5);
    expect(boards[0]?.heroIds).toHaveLength(5);
  });
});
