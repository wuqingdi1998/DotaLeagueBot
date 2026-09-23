import type { StarRaceQuestDefinition, StarRaceQuestRequirement } from "@/app/compendium/model/star-race";

function raceQuest(
  dateKey: string,
  title: string,
  description: string,
  rewardStars: number,
  requirement: StarRaceQuestRequirement,
): StarRaceQuestDefinition {
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

export const OCTOBER_FIRST_RACE_QUESTS: readonly StarRaceQuestDefinition[] = [
  raceQuest(
    "2026-10-05", "Первый шаг",
    "Выиграйте один рейтинговый матч на любом герое.", 2,
    { kind: "ranked-wins", requiredWins: 1 },
  ),
  raceQuest(
    "2026-10-06", "Давление на линии",
    "Нанесите суммарно 15 000 урона строениям в победных рейтинговых матчах за день.", 2,
    { kind: "winning-building-damage", targetDamage: 15_000 },
  ),
  raceQuest(
    "2026-10-07", "Передовая",
    "Выиграйте рейтинговый матч на Axe, Earthshaker, Sven, Tidehunter, Mars или Primal Beast.", 2,
    { kind: "distinct-hero-wins", requiredDistinctWins: 1, heroIds: [2, 7, 18, 29, 129, 137] },
  ),
  raceQuest(
    "2026-10-08", "Десятка",
    "Сделайте не менее 10 убийств в одном победном рейтинговом матче на любом герое.", 2,
    { kind: "ranked-win-stat", heroIds: null, stat: "kills", minimum: 10 },
  ),
  raceQuest(
    "2026-10-09", "Дальний бой",
    "Нанесите суммарно 30 000 урона героям в победных рейтинговых матчах на Drow Ranger, Shadow Fiend, Lina, Sniper, Luna или Muerta.", 2,
    { kind: "cumulative-ranked-win-stat", heroIds: [6, 11, 25, 35, 48, 138], stat: "hero_damage", target: 30_000 },
  ),
  raceQuest(
    "2026-10-10", "Быстрый выходной",
    "Выиграйте один матч в режиме Turbo.", 2,
    { kind: "game-mode-win", gameMode: 23 },
  ),
  raceQuest(
    "2026-10-11", "Финишный дубль",
    "Выиграйте два рейтинговых матча за день.", 3,
    { kind: "ranked-wins", requiredWins: 2 },
  ),
];

export const OCTOBER_SECOND_RACE_QUESTS: readonly StarRaceQuestDefinition[] = [
  raceQuest(
    "2026-10-12", "Новый круг",
    "Выиграйте два рейтинговых матча за день.", 3,
    { kind: "ranked-wins", requiredWins: 2 },
  ),
  raceQuest(
    "2026-10-13", "Осада",
    "Нанесите суммарно 20 000 урона строениям в победных рейтинговых матчах за день.", 3,
    { kind: "winning-building-damage", targetDamage: 20_000 },
  ),
  raceQuest(
    "2026-10-14", "Командная работа",
    "Выиграйте рейтинговый матч на Crystal Maiden, Lion, Shadow Shaman, Witch Doctor, Warlock или Oracle.", 3,
    { kind: "distinct-hero-wins", requiredDistinctWins: 1, heroIds: [5, 26, 27, 30, 37, 111] },
  ),
  raceQuest(
    "2026-10-15", "Серия убийств",
    "Сделайте не менее 15 убийств в одном победном рейтинговом матче на любом герое.", 3,
    { kind: "ranked-win-stat", heroIds: null, stat: "kills", minimum: 15 },
  ),
  raceQuest(
    "2026-10-16", "Герои схватки",
    "Нанесите суммарно 40 000 урона героям в победных рейтинговых матчах на Pudge, Storm Spirit, Queen of Pain, Phantom Assassin, Templar Assassin или Ember Spirit.", 3,
    { kind: "cumulative-ranked-win-stat", heroIds: [14, 17, 39, 44, 46, 106], stat: "hero_damage", target: 40_000 },
  ),
  raceQuest(
    "2026-10-17", "Турбо-суббота",
    "Выиграйте один матч в режиме Turbo.", 3,
    { kind: "game-mode-win", gameMode: 23 },
  ),
  raceQuest(
    "2026-10-18", "Два героя",
    "Выиграйте по одному рейтинговому матчу на двух разных героях из списка: Anti-Mage, Juggernaut, Shadow Fiend, Faceless Void, Luna, Ursa.", 4,
    { kind: "distinct-hero-wins", requiredDistinctWins: 2, heroIds: [1, 8, 11, 41, 48, 70] },
  ),
];

export const OCTOBER_THIRD_RACE_QUESTS: readonly StarRaceQuestDefinition[] = [
  raceQuest(
    "2026-10-19", "Решающий отрезок",
    "Выиграйте два рейтинговых матча за день.", 3,
    { kind: "ranked-wins", requiredWins: 2 },
  ),
  raceQuest(
    "2026-10-20", "До трона",
    "Нанесите суммарно 25 000 урона строениям в победных рейтинговых матчах за день.", 3,
    { kind: "winning-building-damage", targetDamage: 25_000 },
  ),
  raceQuest(
    "2026-10-21", "Сильный матч",
    "Нанесите не менее 30 000 урона героям в одном победном рейтинговом матче на любом герое.", 3,
    { kind: "ranked-win-stat", heroIds: null, stat: "hero_damage", minimum: 30_000 },
  ),
  raceQuest(
    "2026-10-22", "Два лица магии",
    "Выиграйте по одному рейтинговому матчу на двух разных героях из списка: Puck, Storm Spirit, Windranger, Lina, Invoker, Void Spirit.", 4,
    { kind: "distinct-hero-wins", requiredDistinctWins: 2, heroIds: [13, 17, 21, 25, 74, 126] },
  ),
  raceQuest(
    "2026-10-23", "Несокрушимые",
    "Нанесите суммарно 45 000 урона героям в победных рейтинговых матчах на Axe, Sven, Tiny, Slardar, Dragon Knight или Legion Commander.", 4,
    { kind: "cumulative-ranked-win-stat", heroIds: [2, 18, 19, 28, 49, 104], stat: "hero_damage", target: 45_000 },
  ),
  raceQuest(
    "2026-10-24", "Последняя передышка",
    "Выиграйте один матч в режиме Turbo.", 3,
    { kind: "game-mode-win", gameMode: 23 },
  ),
  raceQuest(
    "2026-10-25", "Финальный рывок",
    "Выиграйте три рейтинговых матча за день.", 5,
    { kind: "ranked-wins", requiredWins: 3 },
  ),
];
