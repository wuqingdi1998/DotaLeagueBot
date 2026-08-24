import { describe, expect, it } from "vitest";
import { communityResultForStars } from "./results";

describe("communityResultForStars", () => {
  it("separates reached achievements from the next target", () => {
    const result = communityResultForStars(610);

    expect(result.unlocked.map((reward) => reward.stars)).toEqual([
      100, 200, 300, 500,
    ]);
    expect(result.next?.stars).toBe(700);
    expect(result.starsToNext).toBe(90);
  });

  it("marks the whole reward track complete at the final target", () => {
    const result = communityResultForStars(1_000);

    expect(result.unlocked).toHaveLength(6);
    expect(result.next).toBeNull();
    expect(result.starsToNext).toBe(0);
  });
});
