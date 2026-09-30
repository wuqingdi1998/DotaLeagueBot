import { describe, expect, it } from "vitest";
import {
  OCTOBER_STAR_EARNING_SOURCES,
  OCTOBER_STANDARD_MAX_STARS,
  OCTOBER_SUBSCRIBER_MAX_STARS,
} from "./star-earning";

describe("October star earning guide", () => {
  it("calculates every star source from the October plan", () => {
    expect(OCTOBER_STAR_EARNING_SOURCES.map(({ id, maxStars }) => ({ id, maxStars })))
      .toEqual([
        { id: "hero-quests", maxStars: 60 },
        { id: "clan-outing", maxStars: 21 },
        { id: "star-race", maxStars: 62 },
        { id: "rune-challenge", maxStars: 21 },
      ]);
    expect(OCTOBER_STAR_EARNING_SOURCES.map((source) => source.calculation)).toEqual([
      "12 дней × 2 × 1 + 9 дней × 2 × 2",
      "21 день × 1",
      "15 + 22 + 25 по неделям",
      "21 день × 1",
    ]);
  });

  it("shows separate maximums with and without the subscriber challenge", () => {
    expect(OCTOBER_STANDARD_MAX_STARS).toBe(143);
    expect(OCTOBER_SUBSCRIBER_MAX_STARS).toBe(164);
  });
});
