import { describe, expect, it } from "vitest";
import { predictionRewardStars } from "./predictions";

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
});
