import { describe, expect, it } from "vitest";
import { randomCoinTossWinner } from "./coin-toss";

describe("Fearless Draft coin toss", () => {
  it("always selects exactly one of the two players", () => {
    const players = ["left", "right"] as const;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      expect(players).toContain(randomCoinTossWinner(players));
    }
  });
});
