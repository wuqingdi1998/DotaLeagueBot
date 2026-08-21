import { describe, expect, it } from "vitest";
import { evaluateStarRaceRequirement } from "./star-race-evaluation";
import {
  CURRENT_STAR_RACE,
  starRaceQuestByDate,
  starRaceQuestPhase,
} from "./star-race";
import type { OpenDotaMatch } from "./types";

function rankedWin(matchId: number): OpenDotaMatch {
  return {
    match_id: matchId,
    account_id: 301109815,
    player_slot: 0,
    radiant_win: true,
    duration: 1_800,
    game_mode: 22,
    lobby_type: 7,
    hero_id: 1,
    start_time: Date.parse("2026-08-17T09:00:00.000Z") / 1_000,
  };
}

describe("second star race week", () => {
  it("shows the requested prizes for the first three places", () => {
    expect(CURRENT_STAR_RACE.prizes).toEqual([
      {
        place: 1,
        title: "Набор наград «Тёмного карнавала»",
        imageUrl: "/compendium/star-race/dark-carnival-reward-set.webp",
      },
      {
        place: 2,
        title: "Treasure of Wonders ×2",
        imageUrl: "/compendium/star-race/treasure-of-wonders.webp",
      },
      {
        place: 3,
        title: "The Lightning Orchid",
        imageUrl: "/compendium/star-race/the-lightning-orchid.webp",
      },
    ]);
  });

  it("awards three stars for two ranked wins on Monday", () => {
    const quest = starRaceQuestByDate("2026-08-17");
    expect(quest).toMatchObject({
      title: "Легкая прогулка",
      rewardStars: 3,
      requirement: { kind: "ranked-wins", requiredWins: 2 },
    });
    const evaluation = evaluateStarRaceRequirement({
      requirement: quest!.requirement!,
      matches: [rankedWin(1), rankedWin(2)],
      dayStart: new Date("2026-08-16T21:00:00.000Z"),
      dayEnd: new Date("2026-08-17T21:00:00.000Z"),
      now: new Date("2026-08-17T12:00:00.000Z"),
    });
    expect(evaluation).toMatchObject({ isComplete: true, progress: 2 });
  });

  it("uses the requested Falcons heroes on Tuesday", () => {
    expect(starRaceQuestByDate("2026-08-18")).toMatchObject({
      title: "Соколиный зов",
      rewardStars: 3,
      requirement: {
        kind: "distinct-hero-wins",
        requiredDistinctWins: 1,
        heroIds: [89, 120, 87, 94, 97],
      },
    });
  });

  it("uses the requested tournament meta heroes on Wednesday", () => {
    expect(starRaceQuestByDate("2026-08-19")).toMatchObject({
      title: "Мета турнира",
      rewardStars: 3,
      requirement: {
        kind: "distinct-hero-wins",
        requiredDistinctWins: 1,
        heroIds: [123, 9, 96, 107, 85, 112],
      },
    });
  });

  it("configures Thursday as an Arcana parse check", () => {
    expect(starRaceQuestByDate("2026-08-20")).toMatchObject({
      title: "Pay to Win",
      rewardStars: 3,
      requirement: { kind: "arcana-equipped-ranked-win" },
    });
    expect(starRaceQuestByDate("2026-08-20")?.description).toContain("5 минут");
  });

  it("uses the requested tournament meta heroes on Friday", () => {
    expect(starRaceQuestByDate("2026-08-21")).toMatchObject({
      title: "Мета турнира 2",
      rewardStars: 3,
      requirement: {
        kind: "distinct-hero-wins",
        requiredDistinctWins: 1,
        heroIds: [119, 25, 21, 106, 36, 145],
      },
    });
  });

  it("opens the Saturday final prediction when teams are saved and closes at 05:00", () => {
    const quest = starRaceQuestByDate("2026-08-22")!;
    expect(quest).toMatchObject({
      title: "Финальный прогноз",
      rewardStars: 10,
      requirement: {
        kind: "final-winner-prediction",
        closesAt: "2026-08-22T05:00:00+03:00",
      },
    });
    expect(starRaceQuestPhase(quest, new Date("2026-08-21T19:00:00Z"))).toBe("upcoming");
    expect(starRaceQuestPhase(
      quest,
      new Date("2026-08-21T19:00:00Z"),
      "2026-08-21T18:30:00.000Z",
    )).toBe("active");
    expect(starRaceQuestPhase(
      quest,
      new Date("2026-08-22T02:00:00Z"),
      "2026-08-21T18:30:00.000Z",
    )).toBe("finished");
  });

  it("configures one Turbo win on Sunday", () => {
    expect(starRaceQuestByDate("2026-08-23")).toMatchObject({
      title: "Афтерпати",
      rewardStars: 3,
      requirement: { kind: "game-mode-win", gameMode: 23 },
    });
  });
});
