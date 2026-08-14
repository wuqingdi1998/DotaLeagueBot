import { describe, expect, it } from "vitest";
import { selectTimedOutPickHero } from "./timeout-selection";

describe("Fearless Draft timeout selection", () => {
  it("uses the captain's highlighted hero when it remains available", () => {
    expect(selectTimedOutPickHero([1, 2, 3], 2, 0)).toBe(2);
  });

  it("falls back to the random available hero without a valid highlight", () => {
    expect(selectTimedOutPickHero([1, 2, 3], 9, 1)).toBe(2);
    expect(selectTimedOutPickHero([1, 2, 3], null, 2)).toBe(3);
  });
});
