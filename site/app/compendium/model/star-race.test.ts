import { describe, expect, it } from "vitest";
import {
  CURRENT_STAR_RACE,
  STAR_RACE_END_AT,
  STAR_RACE_PRIZES,
  STAR_RACE_QUESTS,
  STAR_RACE_START_AT,
  STAR_RACE_WEEKS,
  keepGroupedNumbersTogether,
  starRaceForMoment,
  starRacePhase,
  starRacePrizeDescription,
  starRaceQuestProgressLabel,
  starRaceWeekByDate,
  starRaceQuestPhase,
} from "./star-race";

const FIRST_STAR_RACE = STAR_RACE_WEEKS[0];
const FIRST_STAR_RACE_QUESTS = FIRST_STAR_RACE.quests;

describe("star race schedule", () => {
  it("publishes separate previewable prizes for first and second place", () => {
    expect(FIRST_STAR_RACE.prizes).toEqual([
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

  it("prepares the configured scenario for 17 through 23 August 2026", () => {
    expect(new Date(STAR_RACE_START_AT).toISOString()).toBe(
      "2026-08-16T21:00:00.000Z",
    );
    expect(new Date(STAR_RACE_END_AT).toISOString()).toBe(
      "2026-08-23T21:00:00.000Z",
    );
    expect(CURRENT_STAR_RACE.dateLabel).toBe("17–23 августа 2026");
    expect(STAR_RACE_PRIZES).toEqual([]);
    expect(STAR_RACE_QUESTS).toHaveLength(7);
    expect(STAR_RACE_QUESTS.map((quest) => quest.dateKey)).toEqual([
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
      "2026-08-23",
    ]);
    expect(STAR_RACE_QUESTS.slice(0, 4).every((quest) =>
      quest.title !== null &&
      quest.description !== null &&
      quest.rewardStars === 3 &&
      quest.requirement !== null
    )).toBe(true);
    expect(STAR_RACE_QUESTS.every((quest) =>
      quest.title !== null &&
      quest.description !== null &&
      quest.rewardStars !== null &&
      quest.requirement !== null
    )).toBe(true);
    expect(starRacePrizeDescription(STAR_RACE_PRIZES)).toBe(
      "Призы будут объявлены позже.",
    );
  });

  it("keeps every configured week available as a reusable scenario", () => {
    expect(STAR_RACE_WEEKS).toContain(CURRENT_STAR_RACE);
    expect(starRaceWeekByDate("2026-08-12")).toBe(FIRST_STAR_RACE);
    expect(starRaceWeekByDate("2026-08-17")).toBe(CURRENT_STAR_RACE);
    expect(CURRENT_STAR_RACE.quests).toBe(STAR_RACE_QUESTS);
  });

  it("switches to the next scenario exactly when the first week ends", () => {
    expect(starRaceForMoment(new Date("2026-08-16T20:59:59.999Z"))).toBe(
      FIRST_STAR_RACE,
    );
    expect(starRaceForMoment(new Date("2026-08-16T21:00:00.000Z"))).toBe(
      CURRENT_STAR_RACE,
    );
  });

  it("keeps grouped numbers on one line", () => {
    expect(keepGroupedNumbersTogether("Нанесите 50 000 урона")).toBe(
      "Нанесите 50\u00a0000 урона",
    );
    expect(keepGroupedNumbersTogether("Наберите 1 000 000 очков")).toBe(
      "Наберите 1\u00a0000\u00a0000 очков",
    );
  });

  it("shows full details to organizers before launch and everyone afterwards", () => {
    expect(starRacePhase(new Date("2026-08-09T20:59:59.999Z"), false, FIRST_STAR_RACE)).toEqual({
      phase: "upcoming",
      isDetailsVisible: false,
    });
    expect(starRacePhase(new Date("2026-08-09T20:59:59.999Z"), true, FIRST_STAR_RACE)).toEqual({
      phase: "upcoming",
      isDetailsVisible: true,
    });
    expect(starRacePhase(new Date("2026-08-09T21:00:00.000Z"), false, FIRST_STAR_RACE)).toEqual({
      phase: "active",
      isDetailsVisible: true,
    });
  });

  it("makes each quest active only during its own Moscow day", () => {
    const monday = FIRST_STAR_RACE_QUESTS[0];
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

  it("defines Monday's one-win Team Spirit quest", () => {
    expect(FIRST_STAR_RACE_QUESTS[0]).toMatchObject({
      dateKey: "2026-08-10",
      weekday: "Понедельник",
      title: "Легенда СНГ",
      rewardStars: 2,
      requirement: {
        kind: "distinct-hero-wins",
        requiredDistinctWins: 1,
        heroIds: [97, 3, 112, 106, 109],
      },
    });
    expect(FIRST_STAR_RACE_QUESTS[0].description).toContain(
      "The International 2021",
    );
  });

  it("defines Tuesday's cumulative winning building damage quest", () => {
    expect(FIRST_STAR_RACE_QUESTS[1]).toMatchObject({
      dateKey: "2026-08-11",
      weekday: "Вторник",
      title: "Побеждает тот, у кого упадёт трон",
      rewardStars: 2,
      requirement: {
        kind: "winning-building-damage",
        targetDamage: 30_000,
      },
    });
    expect(FIRST_STAR_RACE_QUESTS[1].description).toBe(
      "Нанесите 30 000 урона по строениям. Прогресс засчитывается только в победных рейтинговых матчах и суммируется за все игры в рамках суток.",
    );
  });

  it("defines Wednesday's cumulative 40,000 Pudge or Sniper damage quest", () => {
    expect(FIRST_STAR_RACE_QUESTS[2]).toMatchObject({
      dateKey: "2026-08-12",
      title: "Это снайпер?",
      rewardStars: 2,
      requirement: {
        kind: "cumulative-ranked-win-stat",
        heroIds: [14, 35],
        stat: "hero_damage",
        target: 40_000,
      },
    });
    expect(FIRST_STAR_RACE_QUESTS[2].description).toBe(
      "Нанесите 40 000 урона по героям на Pudge или Sniper. Прогресс засчитывается только в победных рейтинговых матчах и суммируется за все игры в рамках суток.",
    );
    expect(starRaceQuestProgressLabel(FIRST_STAR_RACE_QUESTS[2])).toBe(
      "Урон по героям",
    );
  });

  it("defines Thursday's 15-kill ranked win quest", () => {
    expect(FIRST_STAR_RACE_QUESTS[3]).toMatchObject({
      dateKey: "2026-08-13",
      title: "Пакистанский король",
      rewardStars: 2,
      requirement: {
        kind: "ranked-win-stat",
        heroIds: null,
        stat: "kills",
        minimum: 15,
      },
    });
    expect(FIRST_STAR_RACE_QUESTS[3].description).toContain(
      "сделав 15 и более убийств",
    );
  });

  it("defines Friday's Sand King or Weaver win quest", () => {
    expect(FIRST_STAR_RACE_QUESTS[4]).toMatchObject({
      dateKey: "2026-08-14",
      title: "Welcome to The International!",
      rewardStars: 2,
      requirement: {
        kind: "distinct-hero-wins",
        requiredDistinctWins: 1,
        heroIds: [16, 63],
      },
    });
  });

  it("defines Saturday's OG International 2019 win quest", () => {
    expect(FIRST_STAR_RACE_QUESTS[5]).toMatchObject({
      dateKey: "2026-08-15",
      title: "Чемпионы прошлого Шанхайского The International",
      rewardStars: 2,
      requirement: {
        kind: "distinct-hero-wins",
        requiredDistinctWins: 1,
        heroIds: [91, 19, 102, 98, 72],
      },
    });
    expect(FIRST_STAR_RACE_QUESTS[5].description).toContain("рейтинговый матч");
  });

  it("defines Sunday's Turbo win quest", () => {
    expect(FIRST_STAR_RACE_QUESTS[6]).toMatchObject({
      dateKey: "2026-08-16",
      title: "А разговоров то было...",
      rewardStars: 2,
      requirement: {
        kind: "game-mode-win",
        gameMode: 23,
      },
    });
  });
});
