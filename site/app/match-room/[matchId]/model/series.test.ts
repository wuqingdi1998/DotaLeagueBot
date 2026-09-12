import { describe, expect, it } from "vitest";
import {
  completionButtonLabel,
  evaluateCaptainReports,
  isSeriesComplete,
  seriesScore,
} from "./series";

describe("ordinary match room series", () => {
  it("finishes BO1 after its only map", () => {
    expect(completionButtonLabel(1, 1)).toBe("Матч завершён");
    expect(isSeriesComplete(1, ["a"])).toBe(true);
    expect(seriesScore(["a"])).toEqual({ teamA: 1, teamB: 0 });
  });

  it("plays both maps in BO2 and allows a draw", () => {
    expect(isSeriesComplete(2, ["a"])).toBe(false);
    expect(completionButtonLabel(2, 2)).toBe("Карта 2 завершена");
    expect(isSeriesComplete(2, ["a", "b"])).toBe(true);
    expect(seriesScore(["a", "b"])).toEqual({ teamA: 1, teamB: 1 });
  });

  it("stops BO3 at 2:0 and requests map three after 1:1", () => {
    expect(isSeriesComplete(3, ["a", "a"])).toBe(true);
    expect(isSeriesComplete(3, ["a", "b"])).toBe(false);
    expect(completionButtonLabel(3, 3)).toBe("Карта 3 завершена");
    expect(isSeriesComplete(3, ["a", "b", "a"])).toBe(true);
  });

  it("accepts only identical match IDs and winners", () => {
    const first = { dotaMatchId: "8123456789", winnerSide: "a" as const };
    expect(evaluateCaptainReports([first])).toBe("waiting");
    expect(evaluateCaptainReports([first, { ...first }])).toBe("agreed");
    expect(evaluateCaptainReports([
      first,
      { dotaMatchId: "8123456790", winnerSide: "a" },
    ])).toBe("disputed");
    expect(evaluateCaptainReports([
      first,
      { dotaMatchId: "8123456789", winnerSide: "b" },
    ])).toBe("disputed");
  });
});
