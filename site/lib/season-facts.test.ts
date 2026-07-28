import { describe, expect, it } from "vitest";
import {
  defaultSeasonFacts,
  maximumSeasonFactCount,
  normalizeSeasonFacts,
  seasonFactsValidationError,
} from "./season-facts";

describe("season quick facts", () => {
  it("starts with the two current season counters", () => {
    expect(defaultSeasonFacts(14, 8)).toEqual([
      { value: "14", label: "Всего туров в сезоне" },
      { value: "8", label: "Опубликовано организатором" },
    ]);
  });

  it("accepts between one and nine complete segments", () => {
    expect(
      seasonFactsValidationError(
        normalizeSeasonFacts([{ value: "64", label: "Участника" }]),
      ),
    ).toBeNull();
    expect(
      seasonFactsValidationError(
        Array.from({ length: maximumSeasonFactCount }, (_, index) => ({
          value: String(index + 1),
          label: `Сегмент ${index + 1}`,
        })),
      ),
    ).toBeNull();
  });

  it("rejects empty, incomplete and excessive segment lists", () => {
    expect(seasonFactsValidationError([])).toContain("от 1 до 9");
    expect(
      seasonFactsValidationError([{ value: "", label: "Подпись" }]),
    ).toContain("Заполните");
    expect(
      seasonFactsValidationError(
        Array.from({ length: maximumSeasonFactCount + 1 }, () => ({
          value: "1",
          label: "Сегмент",
        })),
      ),
    ).toContain("от 1 до 9");
  });
});
