import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const predictionHistoryPage = source(
  "../app/compendium/predictions/history/page.tsx",
);
const predictionHistoryRepository = source(
  "../app/compendium/services/prediction-history-repository.ts",
);
const predictionHistoryView = source(
  "../app/compendium/admin/PredictionHistory.tsx",
);
const predictionsView = source(
  "../app/compendium/components/CompendiumPredictions.tsx",
);
const predictionHistoryCss = source(
  "../app/styles/40-compendium-prediction-history.css",
);

describe("prediction history contract", () => {
  it("keeps prediction history private and ordered from newest day", () => {
    expect(predictionHistoryPage).toContain("if (!user?.isAdmin) notFound()");
    expect(predictionHistoryRepository).toContain(
      "ORDER BY match.moscow_date DESC, player.ingame_name, match.position",
    );
    expect(predictionHistoryRepository).toContain(
      "LEFT JOIN compendium_prediction_rewards",
    );
  });

  it("shows organizer history beside prediction controls", () => {
    expect(predictionsView).toContain("История прогнозов");
    expect(predictionsView).toContain("/compendium/predictions/history");
    expect(predictionHistoryView).toContain("prediction-history-score");
    expect(predictionHistoryView).toContain("Заработано за день");
  });

  it("keeps result colors and mobile overflow readable", () => {
    expect(predictionHistoryCss).toContain(".prediction-history-score.correct");
    expect(predictionHistoryCss).toContain(".prediction-history-score.exact");
    expect(predictionHistoryCss).toContain(".prediction-history-score.outcome");
    expect(predictionHistoryCss).toContain(".prediction-history-score.incorrect");
    expect(predictionHistoryCss).toContain("overflow-x: auto");
    expect(predictionHistoryCss).toContain("@media (max-width: 720px)");
  });
});
