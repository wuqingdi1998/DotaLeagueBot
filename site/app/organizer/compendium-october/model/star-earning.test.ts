import { describe, expect, it } from "vitest";
import {
  OCTOBER_ABSOLUTE_MAX_STARS,
  OCTOBER_FASTCUP_PLACE_REWARDS,
  OCTOBER_STAR_EARNING_SOURCES,
  OCTOBER_STANDARD_MAX_STARS,
  OCTOBER_SUBSCRIBER_MAX_STARS,
} from "./star-earning";

describe("October star earning guide", () => {
  it("calculates every star source from the October plan", () => {
    expect(OCTOBER_STAR_EARNING_SOURCES.map(({ id, maxStars }) => ({ id, maxStars })))
      .toEqual([
        { id: "hero-quests", maxStars: 60 },
        { id: "clan-outing", maxStars: 30 },
        { id: "star-race", maxStars: 62 },
        { id: "rune-challenge", maxStars: 30 },
        { id: "league-rounds", maxStars: 9 },
        { id: "fastcups", maxStars: 12 },
      ]);
    expect(OCTOBER_STAR_EARNING_SOURCES.map((source) => source.calculation)).toEqual([
      undefined,
      "12 дней × 1 + 9 дней × 2",
      "15 + 22 + 25 по неделям",
      "12 дней × 1 + 9 дней × 2",
      "Участие – 1 · одна выигранная карта – 2 · две – 3",
      "1-е место – 6 · 2-е – 4 · 3-е – 3 · остальные – 1",
    ]);
  });

  it("uses the agreed Fastcup rewards for every player on the team", () => {
    expect(OCTOBER_FASTCUP_PLACE_REWARDS).toEqual([
      { place: 1, stars: 6 },
      { place: 2, stars: 4 },
      { place: 3, stars: 3 },
      { place: "other", stars: 1 },
    ]);
    expect(OCTOBER_STAR_EARNING_SOURCES.at(-1)?.description).toContain("Fastcup #14");
    expect(OCTOBER_STAR_EARNING_SOURCES.at(-1)?.description).toContain("CD Fastcup #8");
  });

  it("shows base, subscriber and absolute maximums", () => {
    expect(OCTOBER_STANDARD_MAX_STARS).toBe(161);
    expect(OCTOBER_SUBSCRIBER_MAX_STARS).toBe(191);
    expect(OCTOBER_ABSOLUTE_MAX_STARS).toBe(203);
  });
});
