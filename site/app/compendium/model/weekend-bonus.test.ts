import { describe, expect, it } from "vitest";
import {
  dailyChallengeRewardStars,
  isWeekendBonusDate,
} from "./weekend-bonus";

describe("weekly weekend bonus", () => {
  it.each([
    ["2026-08-06", false, 1],
    ["2026-08-07", true, 2],
    ["2026-08-08", true, 2],
    ["2026-08-09", true, 2],
    ["2026-08-10", false, 1],
    ["2026-08-14", true, 2],
    ["2026-08-15", true, 2],
    ["2026-08-16", true, 2],
  ])(
    "uses the recurring Friday-Sunday reward on %s",
    (dateKey, isActive, rewardStars) => {
      expect(isWeekendBonusDate(dateKey)).toBe(isActive);
      expect(dailyChallengeRewardStars(dateKey)).toBe(rewardStars);
    },
  );
});
