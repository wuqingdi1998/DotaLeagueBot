import type { StarRaceQuestRequirement } from "./star-race";
export { OCTOBER_COMPENDIUM_END_AT as FINAL_RACE_END_AT } from "@/lib/october-compendium-schedule";
import { OCTOBER_COMPENDIUM_END_AT } from "@/lib/october-compendium-schedule";

export type FinalRacePath = "core" | "support";
export const FINAL_RACE_PATHS = [
  { id: "core", title: "Путь Разрушения (Core)", raceTitle: "Гонка за звёздами · Путь Разрушения", description: "Урон, натиск и решающий удар", image: "/compendium/october/path-destruction.webp" },
  { id: "support", title: "Путь Созидания (Support)", raceTitle: "Гонка за звёздами · Путь Созидания", description: "Лечение, поддержка и сила команды", image: "/compendium/october/path-creation.webp" },
] as const;

type FinalRaceChallenge = { title: string; description: string; requirement: StarRaceQuestRequirement };
const mondayChallenge: FinalRaceChallenge = { title: "Понедельник день тяжелый", description: "Выиграть 1 рейтинговую игру.", requirement: { kind: "match-stat-win", isRankedOnly: true, conditions: [] } };

export const coreChallenges: readonly FinalRaceChallenge[] = [
  mondayChallenge,
  { title: "До трона", description: "Нанесите суммарно 25 000 урона строениям в победных рейтинговых или обычных All Pick матчах за день.", requirement: { kind: "winning-building-damage", targetDamage: 25_000 } },
  { title: "Всеобщие любимчики", description: "Выиграйте рейтинговый или обычный All Pick матч на одном из героев ниже.", requirement: { kind: "distinct-hero-wins", requiredDistinctWins: 1, heroIds: [1, 2, 74, 104, 12, 21] } },
  { title: "Богатство", description: "Выиграйте рейтинговый или обычный All Pick матч с GPM не ниже 650 (золота в минуту).", requirement: { kind: "match-stat-win", conditions: [{ stat: "gold_per_min", minimum: 650 }] } },
  { title: "Авангард", description: "Выиграйте рейтинговый или обычный All Pick матч на одном из героев ниже.", requirement: { kind: "distinct-hero-wins", requiredDistinctWins: 1, heroIds: [43, 72, 52, 129, 108, 63] } },
  { title: "Золотой темп", description: "Выиграйте рейтинговый или обычный All Pick матч с GPM не ниже 700 (золота в минуту).", requirement: { kind: "match-stat-win", conditions: [{ stat: "gold_per_min", minimum: 700 }] } },
  { title: "Идеалыч (почти)", description: "Выиграйте рейтинговый или обычный All Pick матч, умерев не более 3 раз.", requirement: { kind: "match-stat-win", conditions: [{ stat: "deaths", maximum: 3 }] } },
];

export const supportChallenges: readonly FinalRaceChallenge[] = [
  mondayChallenge,
  { title: "Команда", description: "Сделайте не менее 20 содействий в одном победном рейтинговом или обычном All Pick матче.", requirement: { kind: "match-stat-win", conditions: [{ stat: "assists", minimum: 20 }] } },
  { title: "Всеобщие любимчики", description: "Выиграйте рейтинговый или обычный All Pick матч на одном из героев ниже.", requirement: { kind: "distinct-hero-wins", requiredDistinctWins: 1, heroIds: [5, 50, 31, 26, 14, 30] } },
  { title: "Рядом", description: "Сделайте суммарно 35 содействий в победных рейтинговых или обычных All Pick матчах за день.", requirement: { kind: "cumulative-assists", target: 35 } },
  { title: "Хранители", description: "Выиграйте рейтинговый или обычный All Pick матч на одном из героев ниже.", requirement: { kind: "distinct-hero-wins", requiredDistinctWins: 1, heroIds: [66, 103, 58, 155, 45, 79] } },
  { title: "Целитель", description: "Выиграйте рейтинговый или обычный All Pick матч с лечением не менее 10 000.", requirement: { kind: "match-stat-win", conditions: [{ stat: "hero_healing", minimum: 10000 }] } },
  { title: "Универсальный солдат", description: "Выиграйте рейтинговый или обычный All Pick матч: не более 10 смертей и не менее 20 содействий.", requirement: { kind: "match-stat-win", conditions: [{ stat: "deaths", maximum: 10 }, { stat: "assists", minimum: 20 }] } },
];


export const FINAL_RACE_WEEK_ID = "2026-10-19";
export const FINAL_RACE_START_AT = "2026-10-19T00:00:00+03:00";
export const FINAL_RACE_REGULAR_REWARD = 4;
export const FINAL_RACE_SUNDAY_REWARD = 5;

export function finalRaceReward(day: number) {
  return day === 6 ? FINAL_RACE_SUNDAY_REWARD : FINAL_RACE_REGULAR_REWARD;
}
export const FINAL_RACE_PRIZES = [
  { place: 1, title: "Подписка на любую цветную руну на 3 месяца + Trove of Terror", imageUrl: "/compendium/october/trove-of-terror.webp" },
  { place: 2, title: "Подписка на любую цветную руну на 1 месяц + Trove of Terror", imageUrl: "/compendium/october/trove-of-terror.webp" },
] as const;

export function finalRaceQuests(path: FinalRacePath) {
  const challenges = path === "core" ? coreChallenges : supportChallenges;
  return challenges.map((challenge, index) => ({
    ...challenge, dateKey: `2026-10-${19 + index}`,
    weekday: ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"][index],
    dateLabel: `${19 + index} октября`, rewardStars: finalRaceReward(index),
  }));
}

/** Reserve both paths before selection so a late path choice cannot overlap daily trials. */
export function finalRaceReservedHeroIds(day: number): readonly number[] {
  return [...new Set([coreChallenges[day], supportChallenges[day]].flatMap((challenge) =>
    challenge?.requirement.kind === "distinct-hero-wins" ? challenge.requirement.heroIds : [],
  ))];
}

export function isFinalRaceDate(dateKey: string) {
  return dateKey >= FINAL_RACE_WEEK_ID && dateKey < OCTOBER_COMPENDIUM_END_AT.slice(0, 10);
}
