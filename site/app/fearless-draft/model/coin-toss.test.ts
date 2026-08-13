import { describe, expect, it } from "vitest";
import {
  COIN_TOSS_SEGMENT_COUNT,
  coinTossAngleDegrees,
  coinTossWinnerIndex,
} from "./coin-toss";

describe("Fearless Draft thousand-segment roulette", () => {
  it("maps every hidden segment to exactly one equal half", () => {
    const winners = Array.from(
      { length: COIN_TOSS_SEGMENT_COUNT },
      (_, segment) => coinTossWinnerIndex(segment),
    );
    expect(winners.filter((winner) => winner === 0)).toHaveLength(500);
    expect(winners.filter((winner) => winner === 1)).toHaveLength(500);
  });

  it("points to segment centers instead of sector boundaries", () => {
    expect(coinTossAngleDegrees(0)).toBeCloseTo(0.18);
    expect(coinTossAngleDegrees(999)).toBeCloseTo(359.82);
  });
});
