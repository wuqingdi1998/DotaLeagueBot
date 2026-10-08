import type {
  StarRaceQuestDefinition,
  StarRaceQuestRequirement,
  StarRaceWeekDefinition,
} from "./star-race";
import {
  OCTOBER_COMPENDIUM_END_AT,
  OCTOBER_COMPENDIUM_START_AT,
} from "@/lib/october-compendium-schedule";

export type OctoberRaceQuestDefinition = Omit<
  StarRaceQuestDefinition,
  "title" | "description" | "rewardStars" | "requirement"
> & {
  readonly title: string;
  readonly description: string;
  readonly rewardStars: number;
  readonly requirement: StarRaceQuestRequirement;
};

export type OctoberStarRaceWeekDefinition = Omit<
  StarRaceWeekDefinition,
  "quests"
> & {
  readonly quests: readonly OctoberRaceQuestDefinition[];
};

function raceQuest(
  dateKey: string,
  title: string,
  description: string,
  rewardStars: number,
  requirement: StarRaceQuestRequirement,
): OctoberRaceQuestDefinition {
  const date = new Date(`${dateKey}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC",
    weekday: "long",
  }).format(date);
  const dateLabel = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
  }).format(date);
  return {
    dateKey,
    weekday: weekday[0].toUpperCase() + weekday.slice(1),
    dateLabel,
    title,
    description,
    rewardStars,
    requirement,
  };
}

export const OCTOBER_FIRST_RACE_QUESTS: readonly OctoberRaceQuestDefinition[] = [
  raceQuest("2026-10-05", "Первый шаг", "Выиграйте один рейтинговый матч на любом герое.", 2, { kind: "ranked-wins", requiredWins: 1 }),
  raceQuest("2026-10-06", "Давление на линии", "Нанесите суммарно 15 000 урона строениям в победных рейтинговых матчах за день.", 2, { kind: "winning-building-damage", targetDamage: 15_000 }),
  raceQuest("2026-10-07", "Передовая", "Выиграйте рейтинговый матч на одном из героев ниже.", 2, { kind: "distinct-hero-wins", requiredDistinctWins: 1, heroIds: [2, 7, 18, 29, 129, 137] }),
  raceQuest("2026-10-08", "Десятка", "Сделайте не менее 10 убийств в одном победном рейтинговом или обычном All Pick матче на любом герое.", 2, { kind: "ranked-win-stat", heroIds: null, stat: "kills", minimum: 10 }),
  raceQuest("2026-10-09", "Дальний бой", "30 000 урона героям за день. Победы в рейтинге или обычном All Pick на героях ниже.", 2, { kind: "cumulative-ranked-win-stat", heroIds: [6, 11, 25, 35, 48, 138], stat: "hero_damage", target: 30_000 }),
  raceQuest("2026-10-10", "Быстрый выходной", "Выиграйте один матч в режиме Turbo.", 2, { kind: "game-mode-win", gameMode: 23 }),
  raceQuest("2026-10-11", "Финишный дубль", "Выиграйте два рейтинговых или обычных All Pick матча за день.", 3, { kind: "ranked-wins", requiredWins: 2 }),
];

export const OCTOBER_SECOND_RACE_QUESTS: readonly OctoberRaceQuestDefinition[] = [
  raceQuest("2026-10-12", "Новый круг", "Выиграйте два рейтинговых или обычных All Pick матча за день.", 3, { kind: "ranked-wins", requiredWins: 2 }),
  raceQuest("2026-10-13", "Осада", "Нанесите суммарно 20 000 урона строениям в победных рейтинговых или обычных All Pick матчах за день.", 3, { kind: "winning-building-damage", targetDamage: 20_000 }),
  raceQuest("2026-10-14", "Командная работа", "Выиграйте рейтинговый или обычный All Pick матч на одном из героев ниже.", 3, { kind: "distinct-hero-wins", requiredDistinctWins: 1, heroIds: [5, 26, 27, 30, 37, 111] }),
  raceQuest("2026-10-15", "Серия убийств", "Сделайте не менее 15 убийств в одном победном рейтинговом или обычном All Pick матче на любом герое.", 3, { kind: "ranked-win-stat", heroIds: null, stat: "kills", minimum: 15 }),
  raceQuest("2026-10-16", "Герои схватки", "40 000 урона героям за день. Победы в рейтинге или обычном All Pick на героях ниже.", 3, { kind: "cumulative-ranked-win-stat", heroIds: [14, 17, 39, 44, 46, 106], stat: "hero_damage", target: 40_000 }),
  raceQuest("2026-10-17", "Турбо-суббота", "Выиграйте один матч в режиме Turbo.", 3, { kind: "game-mode-win", gameMode: 23 }),
  raceQuest("2026-10-18", "Два героя", "Выиграйте по одному рейтинговому или обычному All Pick матчу на двух разных героях из списка ниже.", 4, { kind: "distinct-hero-wins", requiredDistinctWins: 2, heroIds: [1, 8, 11, 41, 48, 70] }),
];

export const OCTOBER_THIRD_RACE_QUESTS: readonly OctoberRaceQuestDefinition[] = [
  raceQuest("2026-10-19", "Решающий отрезок", "Выиграйте два рейтинговых или обычных All Pick матча за день.", 3, { kind: "ranked-wins", requiredWins: 2 }),
  raceQuest("2026-10-20", "До трона", "Нанесите суммарно 25 000 урона строениям в победных рейтинговых или обычных All Pick матчах за день.", 3, { kind: "winning-building-damage", targetDamage: 25_000 }),
  raceQuest("2026-10-21", "Сильный матч", "Нанесите не менее 30 000 урона героям в одном победном рейтинговом или обычном All Pick матче на любом герое.", 3, { kind: "ranked-win-stat", heroIds: null, stat: "hero_damage", minimum: 30_000 }),
  raceQuest("2026-10-22", "Два лица магии", "Выиграйте по одному рейтинговому или обычному All Pick матчу на двух разных героях из списка ниже.", 4, { kind: "distinct-hero-wins", requiredDistinctWins: 2, heroIds: [13, 17, 21, 25, 74, 126] }),
  raceQuest("2026-10-23", "Несокрушимые", "45 000 урона героям за день. Победы в рейтинге или обычном All Pick на героях ниже.", 4, { kind: "cumulative-ranked-win-stat", heroIds: [2, 18, 19, 28, 49, 104], stat: "hero_damage", target: 45_000 }),
  raceQuest("2026-10-24", "Последняя передышка", "Выиграйте один матч в режиме Turbo.", 3, { kind: "game-mode-win", gameMode: 23 }),
  raceQuest("2026-10-25", "Финальный рывок", "Выиграйте три рейтинговых или обычных All Pick матча за день.", 5, { kind: "ranked-wins", requiredWins: 3 }),
];

const dotaPlusRacePrizes = [
  { place: 1, title: "1 месяц Dota+ + 1 месяц подарочной подписки на любую цветную руну Boosty", imageUrl: "/compendium/october/dota-plus-one-month.png" },
  { place: 2, title: "The Igneous Stone", imageUrl: "/compendium/october/the-igneous-stone.png" },
] as const;

const unannouncedPrizes = [
  { place: 1, title: "Предмет выберем позже", imageUrl: null },
  { place: 2, title: "Предмет выберем позже", imageUrl: null },
] as const;

export const OCTOBER_COMPENDIUM_WEEKS: readonly OctoberStarRaceWeekDefinition[] = [
  { id: "2026-10-05", title: "Гонка за звёздами · Разгон", dateLabel: "5–11 октября 2026", startsAt: OCTOBER_COMPENDIUM_START_AT, endsAt: "2026-10-12T00:00:00+03:00", prizes: dotaPlusRacePrizes, quests: OCTOBER_FIRST_RACE_QUESTS },
  { id: "2026-10-12", title: "Гонка за звёздами · Темп", dateLabel: "12–18 октября 2026", startsAt: "2026-10-12T00:00:00+03:00", endsAt: "2026-10-19T00:00:00+03:00", prizes: dotaPlusRacePrizes, quests: OCTOBER_SECOND_RACE_QUESTS },
  { id: "2026-10-19", title: "Гонка за звёздами · Финал", dateLabel: "19–25 октября 2026", startsAt: "2026-10-19T00:00:00+03:00", endsAt: OCTOBER_COMPENDIUM_END_AT, prizes: unannouncedPrizes, quests: OCTOBER_THIRD_RACE_QUESTS },
];
