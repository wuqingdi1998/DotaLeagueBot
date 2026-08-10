import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source(
  "../../bot/database/migrations/0066_compendium_prediction_opening.sql",
);
const repository = source(
  "../app/compendium/services/prediction-repository.ts",
);
const adminRoute = source(
  "../app/api/admin/compendium-predictions/route.ts",
);
const dayEditor = source(
  "../app/compendium/admin/PredictionDayEditor.tsx",
);
const predictionAdmin = source(
  "../app/compendium/admin/PredictionAdmin.tsx",
);
const predictionsView = source(
  "../app/compendium/components/CompendiumPredictions.tsx",
);

describe("prediction day opening contract", () => {
  it("opens each prediction day at the organizer's configured moment", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS compendium_prediction_days",
    );
    expect(migration).toContain("opens_at TIMESTAMPTZ NOT NULL");
    expect(repository).toContain("JOIN compendium_prediction_days");
    expect(repository).toContain("row.opens_at.getTime() <= now.getTime()");
    expect(repository).toContain("row.opens_at > input.now");
    expect(adminRoute).toContain("opensAt: body.opensAt");
    expect(dayEditor).toContain("Открыть прогнозы");
    expect(predictionAdmin).toContain("openingDateKey");
    expect(predictionsView).toContain("Откроется");
    expect(predictionsView).toContain("currentTimeMs");
  });
});
