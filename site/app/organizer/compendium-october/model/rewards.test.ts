import { describe, expect, it } from "vitest";
import { octoberDailyRerollAllowance, octoberRewardsForStars } from "./rewards";

describe("October personal rewards", () => {
  it("uses only the requested twelve-star steps", () => {
    expect(octoberRewardsForStars(0).map((reward) => reward.stars))
      .toEqual([12, 24, 36, 48, 60]);
    expect(octoberRewardsForStars(59).some((reward) => reward.stars === 100)).toBe(false);
    expect(octoberRewardsForStars(60).map((reward) => reward.stars))
      .toEqual([12, 24, 36, 48, 60, 100]);
  });

  it("adds one daily reroll at 24 and another at 48, never at 15", () => {
    expect([0, 12, 15, 23, 24, 36, 47, 48, 100].map(octoberDailyRerollAllowance))
      .toEqual([1, 1, 1, 1, 2, 2, 2, 3, 3]);
  });
});
