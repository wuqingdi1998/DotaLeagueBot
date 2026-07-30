import { describe, expect, it } from "vitest";
import { validateFinishedMatchScore } from "./match-validation";

describe("tournament match score validation", () => {
  it("accepts normal BO1, BO2, BO3 and BO5 results", () => {
    expect(validateFinishedMatchScore(1, 0, 1)).toBe("");
    expect(validateFinishedMatchScore(1, 1, 2)).toBe("");
    expect(validateFinishedMatchScore(2, 0, 3)).toBe("");
    expect(validateFinishedMatchScore(3, 2, 5)).toBe("");
  });

  it("rejects negative, impossible and unfinished scores", () => {
    expect(validateFinishedMatchScore(-1, 1, 3)).not.toBe("");
    expect(validateFinishedMatchScore(9, 0, 3)).not.toBe("");
    expect(validateFinishedMatchScore(1, 0, 3)).not.toBe("");
    expect(validateFinishedMatchScore(1, 1, 3)).not.toBe("");
    expect(validateFinishedMatchScore(2, 1, 2)).not.toBe("");
  });
});
