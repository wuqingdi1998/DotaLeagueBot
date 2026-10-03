import { readFileSync } from "node:fs";
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
        { id: "rune-challenge", maxStars: 30 },
        { id: "star-race", maxStars: 62 },
        { id: "league-rounds", maxStars: 9 },
        { id: "fastcups", maxStars: 12 },
      ]);
    expect(OCTOBER_STAR_EARNING_SOURCES.map((source) => source.rewardDetails)).toEqual([
      [
        { label: "12 обычных дней", stars: 1 },
        { label: "9 дней с бонусом выходного дня", stars: 2 },
      ],
      [
        { label: "12 обычных дней", stars: 1 },
        { label: "9 дней с бонусом выходного дня", stars: 2 },
      ],
      [
        { label: "12 обычных дней", stars: 1 },
        { label: "9 дней с бонусом выходного дня", stars: 2 },
      ],
      [
        { label: "1-я неделя", stars: 15 },
        { label: "2-я неделя", stars: 22 },
        { label: "3-я неделя", stars: 25 },
      ],
      [
        { label: "Участие", stars: 1 },
        { label: "Одна выигранная карта", stars: 2 },
        { label: "Две выигранные карты", stars: 3 },
      ],
      [
        { label: "1-е место", stars: 6 },
        { label: "2-е место", stars: 4 },
        { label: "3-е место", stars: 3 },
        { label: "Остальные места", stars: 1 },
      ],
    ]);
  });

  it("uses the agreed Fastcup rewards for every player on the team", () => {
    expect(OCTOBER_FASTCUP_PLACE_REWARDS).toEqual([
      { place: 1, stars: 6 },
      { place: 2, stars: 4 },
      { place: 3, stars: 3 },
      { place: "other", stars: 1 },
    ]);
    expect(OCTOBER_STAR_EARNING_SOURCES.at(-1)?.tournaments).toMatchObject([
      { linkId: "fastcup-14", label: "Fastcup #14" },
      { linkId: "cd-fastcup-8", label: "CD Fastcup #8" },
    ]);
  });

  it("shows base, subscriber and absolute maximums", () => {
    expect(OCTOBER_STANDARD_MAX_STARS).toBe(161);
    expect(OCTOBER_SUBSCRIBER_MAX_STARS).toBe(191);
    expect(OCTOBER_ABSOLUTE_MAX_STARS).toBe(203);
  });

  it("shows the organizer link editor beside an unlinked Fastcup", () => {
    const guide = readFileSync(
      new URL("../components/OctoberStarEarningGuide.tsx", import.meta.url),
      "utf8",
    );

    expect(guide).toContain("SeasonTournamentLinkEditor");
    expect(guide).toContain("isOrganizer && source.tournaments?.map");
    expect(guide).toContain("tournamentLinks[tournament.linkId]");
  });
});
