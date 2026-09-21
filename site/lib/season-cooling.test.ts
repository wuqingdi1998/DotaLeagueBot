import { describe, expect, it } from "vitest";
import { calculateSeasonCooling } from "./season-cooling";

const rounds = Array.from({ length: 10 }, (_, index) => ({
  roundNumber: index + 1,
  isCompleted: true,
}));

describe("season penalty cooling", () => {
  it("waits for organizer approval after three clean completed rounds", () => {
    expect(calculateSeasonCooling(rounds.slice(0, 6), [{ roundNumber: 3, fires: 2 }], []))
      .toMatchObject({
        progress: 3,
        pendingRoundNumber: 6,
        remainingFires: 2,
        appliedRoundNumbers: [],
      });
  });

  it("removes one fire for each approved group of three rounds", () => {
    expect(calculateSeasonCooling(rounds.slice(0, 9), [{ roundNumber: 3, fires: 3 }], [6, 9]))
      .toMatchObject({
        progress: 0,
        pendingRoundNumber: null,
        remainingFires: 1,
        appliedRoundNumbers: [6, 9],
      });
  });

  it("resets the timer when a new fire is given", () => {
    expect(calculateSeasonCooling(rounds, [
      { roundNumber: 3, fires: 2 },
      { roundNumber: 8, fires: 1 },
    ], [6])).toMatchObject({
      progress: 2,
      pendingRoundNumber: null,
      remainingFires: 2,
      appliedRoundNumbers: [6],
    });
  });

  it("automatically reverses an approval when a late penalty changes its window", () => {
    expect(calculateSeasonCooling(rounds.slice(0, 6), [
      { roundNumber: 3, fires: 1 },
      { roundNumber: 5, fires: 1 },
    ], [6])).toMatchObject({
      progress: 1,
      pendingRoundNumber: null,
      remainingFires: 2,
      appliedRoundNumbers: [],
      invalidRoundNumbers: [6],
    });
  });

  it("does not count unfinished rounds or cool below zero", () => {
    expect(calculateSeasonCooling([
      { roundNumber: 1, isCompleted: true },
      { roundNumber: 2, isCompleted: true },
      { roundNumber: 3, isCompleted: true },
      { roundNumber: 4, isCompleted: false },
    ], [{ roundNumber: 1, fires: 1 }], [])).toMatchObject({
      progress: 2,
      pendingRoundNumber: null,
      remainingFires: 1,
    });
    expect(calculateSeasonCooling(rounds, [{ roundNumber: 1, fires: 1 }], [4]))
      .toMatchObject({ remainingFires: 0, pendingRoundNumber: null });
  });
});
