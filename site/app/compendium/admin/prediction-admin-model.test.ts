import { describe, expect, it } from "vitest";
import {
  groupPredictionMatchesByDate,
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
    expect(groups[0].matches).toHaveLength(2);
    expect(groups[0].opensAt).toBe("2026-08-09T15:00:00.000Z");
  });

  it("restores the configured Moscow opening date and time", () => {
    expect(predictionOpeningDraftForDate([match()], "2026-08-10")).toEqual({
      dateKey: "2026-08-09",
      time: "18:00",
    });
  });
});
