import { describe, expect, it } from "vitest";
import { evaluateStarRaceRequirement } from "./star-race-evaluation";
import { starRaceQuestByDate } from "./star-race";
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

  it("leaves Friday through Sunday unconfigured", () => {
    for (const dateKey of ["2026-08-21", "2026-08-22", "2026-08-23"]) {
      expect(starRaceQuestByDate(dateKey)).toMatchObject({
        title: null,
        rewardStars: null,
        requirement: null,
      });
    }
  });
});
