import { describe, expect, it } from "vitest";
import {
  STAR_RACE_END_AT,
  STAR_RACE_PRIZES,
  STAR_RACE_QUESTS,
  STAR_RACE_START_AT,
  starRacePhase,
  starRaceQuestPhase,
} from "./star-race";

describe("star race schedule", () => {
  it("publishes separate previewable prizes for first and second place", () => {
    expect(STAR_RACE_PRIZES).toEqual([
      {
        place: 1,
        title: "Сет Beast of Thunder на Storm Spirit",
        imageUrl:
          "/compendium/star-race/beast-of-thunder-storm-spirit.gif",
      },
      {
        place: 2,
        title: "Сет Primeval Abomination на Primal Beast",
        imageUrl:
          "/compendium/star-race/primeval-abomination-primal-beast.jpg",
      },
    ]);
  });

  it("runs from 10 through 16 August 2026 in Moscow", () => {
    expect(new Date(STAR_RACE_START_AT).toISOString()).toBe(
      "2026-08-09T21:00:00.000Z",
    );
    expect(new Date(STAR_RACE_END_AT).toISOString()).toBe(
      "2026-08-16T21:00:00.000Z",
    );
    expect(STAR_RACE_QUESTS).toHaveLength(7);
  });

  it("shows full details to organizers before launch and everyone afterwards", () => {
    expect(starRacePhase(new Date("2026-08-09T20:59:59.999Z"), false)).toEqual({
      phase: "upcoming",
      isDetailsVisible: false,
    });
    expect(starRacePhase(new Date("2026-08-09T20:59:59.999Z"), true)).toEqual({
      phase: "upcoming",
      isDetailsVisible: true,
    });
    expect(starRacePhase(new Date("2026-08-09T21:00:00.000Z"), false)).toEqual({
      phase: "active",
      isDetailsVisible: true,
    });
  });

  it("makes each quest active only during its own Moscow day", () => {
    const monday = STAR_RACE_QUESTS[0];
    expect(starRaceQuestPhase(monday, new Date("2026-08-09T20:59:59.999Z"))).toBe(
      "upcoming",
    );
    expect(starRaceQuestPhase(monday, new Date("2026-08-10T12:00:00.000Z"))).toBe(
      "active",
    );
    expect(starRaceQuestPhase(monday, new Date("2026-08-10T21:00:00.000Z"))).toBe(
      "finished",
    );
  });

  it("defines Monday's two-star Team Spirit quest", () => {
    expect(STAR_RACE_QUESTS[0]).toMatchObject({
      dateKey: "2026-08-10",
      weekday: "Понедельник",
      title: "Легенда СНГ",
      rewardStars: 2,
      requirement: {
        kind: "distinct-hero-wins",
        requiredDistinctWins: 2,
        heroIds: [97, 3, 112, 106, 109],
      },
    });
  });

  it("defines Tuesday's cumulative winning building damage quest", () => {
    expect(STAR_RACE_QUESTS[1]).toMatchObject({
      dateKey: "2026-08-11",
      weekday: "Вторник",
      title: "Побеждает тот, у кого упадёт трон",
      rewardStars: 2,
      requirement: {
        kind: "winning-building-damage",
        targetDamage: 30_000,
      },
    });
    expect(STAR_RACE_QUESTS.slice(2).every((quest) => quest.title === null)).toBe(
      true,
    );
  });
});
