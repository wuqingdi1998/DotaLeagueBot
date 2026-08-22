import { describe, expect, it } from "vitest";
import {
  isPredictionScoreForWinsRequired,
  predictionRewardStars,
  predictionScoresForWinsRequired,
} from "./predictions";

describe("predictionRewardStars", () => {
  it("gives two stars for the exact score", () => {
    expect(predictionRewardStars("2:1", "2:1")).toBe(2);
  });

  it("gives one star for the correct winner", () => {
    expect(predictionRewardStars("2:0", "2:1")).toBe(1);
    expect(predictionRewardStars("0:2", "1:2")).toBe(1);
  });

  it("gives no stars for the wrong winner", () => {
    expect(predictionRewardStars("2:1", "1:2")).toBe(0);
  });

  it("supports a five-star exact score and three-star outcome for best-of-five", () => {
    const rewards = { exactScore: 5, correctOutcome: 3 };
    expect(predictionRewardStars("3:2", "3:2", rewards)).toBe(5);
    expect(predictionRewardStars("3:0", "3:2", rewards)).toBe(3);
    expect(predictionRewardStars("2:3", "3:2", rewards)).toBe(0);
  });
});

describe("prediction score options", () => {
  it("uses six valid scores for a best-of-five match", () => {
    expect(predictionScoresForWinsRequired(3)).toEqual([
      "3:0", "3:1", "3:2", "2:3", "1:3", "0:3",
    ]);
    expect(isPredictionScoreForWinsRequired("3:2", 3)).toBe(true);
    expect(isPredictionScoreForWinsRequired("2:1", 3)).toBe(false);
  });
});
