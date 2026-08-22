import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => fs.readFileSync(
  path.resolve(process.cwd(), relativePath),
  "utf8",
);

const migration = source(
  "../bot/database/migrations/0083_fix_team_vision_prediction_date.sql",
);
const repository = source("app/compendium/services/prediction-repository.ts");
const predictionsView = source("app/compendium/components/CompendiumPredictions.tsx");

describe("best-of-five prediction contract", () => {
  it("configures the scheduled TBD versus TEAM VISION match", () => {
    expect(migration).toContain("moscow_date = DATE '2026-08-23'");
    expect(migration).toContain("team_a_key = 'tbd'");
    expect(migration).toContain("team_b_key = 'team-vision'");
    expect(migration).toContain("wins_required = 3");
    expect(migration).toContain("exact_score_reward = 5");
    expect(migration).toContain("outcome_reward = 3");
    expect(migration).toContain("RAISE EXCEPTION");
  });

  it("keeps existing picks while converting them to best-of-five scores", () => {
    expect(migration).toContain("UPDATE compendium_prediction_picks");
    expect(migration).toContain("WHEN '2:0' THEN '3:0'");
    expect(migration).toContain("WHEN '2:1' THEN '3:1'");
    expect(migration).toContain("WHEN '1:2' THEN '1:3'");
    expect(migration).toContain("WHEN '0:2' THEN '0:3'");
  });

  it("validates each saved pick and result against that match", () => {
    expect(repository).toContain("isPredictionScoreForWinsRequired");
    expect(repository).toContain("exactScore: row.exact_score_reward");
    expect(repository).toContain("correctOutcome: row.outcome_reward");
    expect(predictionsView).toContain("match.scoreOptions.map");
  });
});
