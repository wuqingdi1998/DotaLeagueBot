import { expect, it } from "vitest";
import { dailyQuestExcludedHeroIds } from "./daily-quest-exclusions";

it.each([
  ["2026-10-21", [1, 2, 74, 104, 12, 21, 5, 50, 31, 26, 14, 30]],
  ["2026-10-23", [43, 72, 52, 129, 108, 63, 66, 103, 58, 155, 45, 79]],
] as const)("reserves both paths' race heroes on %s, including before path selection", (date, heroes) => {
  expect(new Set(dailyQuestExcludedHeroIds(date))).toEqual(new Set(heroes));
});

it.each(["2026-10-18", "2026-10-19", "2026-10-20", "2026-10-22", "2026-10-24", "2026-10-25", "2026-10-26"])(
  "does not reserve final-race heroes on %s", (date) => {
    expect(dailyQuestExcludedHeroIds(date)).toEqual([]);
  },
);
