import { describe, expect, it } from "vitest";
import { octoberDailyRerollAllowance, octoberRewardsForStars } from "./rewards";

describe("October personal rewards", () => {
  it("uses the requested five visible milestones and hidden platinum level", () => {
    expect(octoberRewardsForStars(0).map((reward) => reward.stars))
      .toEqual([10, 25, 40, 60, 80]);
    expect(octoberRewardsForStars(79).some((reward) => reward.stars === 120)).toBe(false);
    expect(octoberRewardsForStars(80).map((reward) => reward.stars))
      .toEqual([10, 25, 40, 60, 80, 120]);
  });

  it("adds one daily reroll at 25 and another at 60", () => {
    expect([0, 10, 24, 25, 40, 59, 60, 120].map(octoberDailyRerollAllowance))
      .toEqual([1, 1, 1, 2, 2, 2, 3, 3]);
  });
});
