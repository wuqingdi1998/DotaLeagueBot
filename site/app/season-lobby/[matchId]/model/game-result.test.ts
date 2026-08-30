import { describe, expect, it } from "vitest";
import { isFinalSeasonGame, seasonSeriesScore } from "./game-result";

describe("season lobby game result", () => {
  it("keeps a BO2 series open after the first game", () => {
    expect(isFinalSeasonGame(1, 2)).toBe(false);
  });

  it("finishes a BO2 series after the second game", () => {
    expect(isFinalSeasonGame(2, 2)).toBe(true);
  });

  it("turns two map winners into the final match score", () => {
    expect(seasonSeriesScore(["a", "b"])).toEqual({
      teamAScore: 1,
      teamBScore: 1,
      result: "draw",
    });
    expect(seasonSeriesScore(["a", "a"])).toEqual({
      teamAScore: 2,
      teamBScore: 0,
      result: "team_a",
    });
  });
});
