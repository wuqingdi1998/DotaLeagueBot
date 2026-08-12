import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const route = source("../app/api/admin/compendium-predictions/route.ts");
const repository = source(
  "../app/compendium/services/prediction-repository.ts",
);
const editor = source("../app/compendium/admin/PredictionAdmin.tsx");
const dayEditor = source("../app/compendium/admin/PredictionDayEditor.tsx");

describe("prediction schedule editing contract", () => {
  it("passes the original saved date through the protected organizer route", () => {
    expect(route).toContain("sourceDateKey: body.sourceDateKey");
    expect(route).toContain("const administrator = await requireAdmin()");
  });

  it("moves existing matches instead of deleting them so picks stay linked", () => {
    const relocationStart = repository.indexOf(
      "export async function relocatePredictionMatches",
    );
    const relocationEnd = repository.indexOf(
      "export async function loadPredictionAdminMatches",
    );
    const relocation = repository.slice(relocationStart, relocationEnd);

    expect(relocation).toContain("UPDATE compendium_prediction_matches");
    expect(relocation).toContain("WHERE id = $1");
    expect(relocation).not.toContain("DELETE FROM compendium_prediction_matches");
  });

  it("separates selecting a new date from opening a saved day", () => {
    expect(editor).toContain("sourceDateKey");
    expect(editor).toContain("onDateChange={setDateKey}");
    expect(dayEditor).toContain("Прогнозы участников сохранятся");
  });
});
