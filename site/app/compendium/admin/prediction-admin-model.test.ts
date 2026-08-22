import { describe, expect, it } from "vitest";
import {
  groupPredictionMatchesByDate,
  nextAvailablePredictionDate,
  predictionOpeningDraftForDate,
  predictionDraftsForDate,
  predictionMatchCountForDate,
} from "./prediction-admin-model";
import type { PredictionAdminMatch } from "../services/prediction-repository";

function match(input: Partial<PredictionAdminMatch> = {}): PredictionAdminMatch {
  return {
    id: "1",
    moscowDate: "2026-08-10",
    position: 1,
    startsAt: "2026-08-10T09:00:00.000Z",
    teamA: { key: "tbd", name: "TBD", logoUrl: "/tbd-team.svg" },
    teamB: { key: "og", name: "OG", logoUrl: "/api/compendium/teams/og" },
    scoreOptions: ["2:0", "2:1", "1:2", "0:2"],
    exactScoreRewardStars: 2,
    outcomeRewardStars: 1,
    actualScore: null,
    opensAt: "2026-08-09T15:00:00.000Z",
    ...input,
  };
}

describe("prediction organizer schedule model", () => {
  it("restores a two-match day and leaves the third draft ready", () => {
    const matches = [match(), match({ id: "2", position: 2 })];
    expect(predictionMatchCountForDate(matches, "2026-08-10")).toBe(2);
    expect(predictionDraftsForDate(matches, "2026-08-10")).toHaveLength(3);
    expect(predictionDraftsForDate(matches, "2026-08-10")[0]).toMatchObject({
      teamAKey: "tbd",
      teamBKey: "og",
    });
  });

  it("groups the stored list by Moscow date", () => {
    const groups = groupPredictionMatchesByDate([
      match(),
      match({ id: "2", moscowDate: "2026-08-11" }),
      match({ id: "3", position: 2 }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].dateKey).toBe("2026-08-11");
    expect(groups[1].matches).toHaveLength(2);
    expect(groups[1].opensAt).toBe("2026-08-09T15:00:00.000Z");
  });

  it("chooses the nearest free day after today for a new schedule", () => {
    const matches = [
      match({ moscowDate: "2026-08-14" }),
      match({ id: "2", moscowDate: "2026-08-15" }),
    ];
    expect(nextAvailablePredictionDate(matches, "2026-08-13")).toBe(
      "2026-08-16",
    );
  });

  it("restores the configured Moscow opening date and time", () => {
    expect(predictionOpeningDraftForDate([match()], "2026-08-10")).toEqual({
      dateKey: "2026-08-09",
      time: "18:00",
    });
  });
});
