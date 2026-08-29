import { describe, expect, it } from "vitest";
import {
  DRAFT_SUGGESTION_BREATHE_DURATION_MS,
  DRAFT_SUGGESTION_DASH_COUNT,
  DRAFT_SUGGESTION_DASH_PATH_LENGTH,
  DRAFT_SUGGESTION_RUN_DURATION_MS,
  draftSuggestionDashLayers,
  draftSuggestionAnimationFrame,
  stableServerClockOffset,
} from "./suggestion-animation";

describe("Fearless Draft synchronized suggestion animation", () => {
  it("alternates exactly twenty dashes between up to five player colors", () => {
    expect(DRAFT_SUGGESTION_DASH_COUNT).toBe(20);
    const expectedCounts = [
      [20],
      [10, 10],
      [7, 7, 6],
      [5, 5, 5, 5],
      [4, 4, 4, 4, 4],
    ];

    expectedCounts.forEach((counts, index) => {
      const colors = Array.from({ length: index + 1 }, (_, colorIndex) =>
        `color-${colorIndex}`,
      );
      const layers = draftSuggestionDashLayers(colors);
      expect(layers.map((layer) => layer.dashCount)).toEqual(counts);
      expect(layers.map((layer) => layer.color)).toEqual(colors);
      expect(layers.reduce((total, layer) => total + layer.dashCount, 0)).toBe(20);
    });
  });

  it("moves one complete dash path in twelve seconds", () => {
    expect(DRAFT_SUGGESTION_RUN_DURATION_MS).toBe(12_000);
    expect(draftSuggestionAnimationFrame(0).dashTravel).toBe(0);
    expect(draftSuggestionAnimationFrame(6_000).dashTravel).toBe(
      DRAFT_SUGGESTION_DASH_PATH_LENGTH / 2,
    );
    expect(draftSuggestionAnimationFrame(12_000).dashTravel).toBe(0);
  });

  it("gives every frame the same breathing phase for one server timestamp", () => {
    expect(DRAFT_SUGGESTION_BREATHE_DURATION_MS).toBe(4_800);
    expect(draftSuggestionAnimationFrame(0)).toMatchObject({
      opacity: 0.4,
      glowRadius: 1,
    });
    expect(draftSuggestionAnimationFrame(2_400)).toMatchObject({
      opacity: 1,
      glowRadius: 4,
    });
    expect(draftSuggestionAnimationFrame(7_200)).toMatchObject({
      opacity: 1,
      glowRadius: 4,
    });
  });

  it("keeps the lowest observed network delay instead of chasing every snapshot", () => {
    expect(stableServerClockOffset(null, 10_000)).toBe(10_000);
    expect(stableServerClockOffset(10_000, 9_940)).toBe(10_000);
    expect(stableServerClockOffset(10_000, 10_015)).toBe(10_015);
  });
});
