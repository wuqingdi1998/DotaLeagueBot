import { describe, expect, it } from "vitest";
import {
  COIN_TOSS_SEGMENT_COUNT,
  coinTossWinnerIndex,
} from "../model/coin-toss";
import { randomCoinTossResult, randomCoinTossWinner } from "./coin-toss";

describe("Fearless Draft coin toss", () => {
  it("always selects exactly one of the two players", () => {
    const players = ["left", "right"] as const;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      expect(players).toContain(randomCoinTossWinner(players));
    }
  });

  it("selects and preserves one of one thousand invisible segments", () => {
    const players = ["left", "right"] as const;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const result = randomCoinTossResult(players);
      expect(result.segment).toBeGreaterThanOrEqual(0);
      expect(result.segment).toBeLessThan(COIN_TOSS_SEGMENT_COUNT);
      expect(result.winnerId).toBe(players[coinTossWinnerIndex(result.segment)]);
    }
  });
});
