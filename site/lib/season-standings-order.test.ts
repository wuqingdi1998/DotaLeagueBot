import { describe, expect, it } from "vitest";
import {
  compareSeasonPenaltyStages,
  compareSeasonStandingPerformance,
} from "./season-standings-order";

describe("season standings display order", () => {
  it("sorts players outside the main table by points and regular tie-breakers", () => {
    const rows = [
      { nickname: "Bravo", points: 4, winRate: 0.5, playedRounds: 5 },
      { nickname: "Alpha", points: 7, winRate: 0.4, playedRounds: 4 },
      { nickname: "Charlie", points: 4, winRate: 0.75, playedRounds: 3 },
    ];

    expect(rows.sort(compareSeasonStandingPerformance).map((row) => row.nickname))
      .toEqual(["Alpha", "Charlie", "Bravo"]);
  });

  it("sorts penalty fires by each limit column from left to right", () => {
    const rows = [
      { nickname: "First remainder", penaltyStages: [4, null, null, null] },
      { nickname: "Second limit two", penaltyStages: [5, 2, null, null] },
      { nickname: "Second limit four", penaltyStages: [5, 4, null, null] },
      { nickname: "Third limit", penaltyStages: [5, 5, 1, null] },
    ];

    expect(rows.sort(compareSeasonPenaltyStages).map((row) => row.nickname))
      .toEqual([
        "Third limit",
        "Second limit four",
        "Second limit two",
        "First remainder",
      ]);
  });
});
