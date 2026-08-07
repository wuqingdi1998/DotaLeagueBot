import { compendiumHeroById } from "./heroes";
import { moscowDayBounds } from "./time";
import type { CompendiumHero } from "./types";

export const STAR_RACE_START_AT = "2026-08-10T00:00:00+03:00";
export const STAR_RACE_END_AT = "2026-08-17T00:00:00+03:00";
export const STAR_RACE_PRIZES = [
  {
    place: 1,
    title: "Сет Beast of Thunder на Storm Spirit",
    imageUrl: "/compendium/star-race/beast-of-thunder-storm-spirit.gif",
  },
  {
    place: 2,
    title: "Сет Primeval Abomination на Primal Beast",
    imageUrl: "/compendium/star-race/primeval-abomination-primal-beast.jpg",
  },
] as const;

export type StarRacePrize = (typeof STAR_RACE_PRIZES)[number];

export type StarRacePhase = "upcoming" | "active" | "finished";
export type StarRaceQuestPhase = "upcoming" | "active" | "finished";

export type StarRaceQuestRequirement =
  | {
      readonly kind: "distinct-hero-wins";
      readonly requiredDistinctWins: number;
      readonly heroIds: readonly number[];
    }
  | {
      readonly kind: "winning-building-damage";
      readonly targetDamage: number;
    }
  | {
      readonly kind: "ranked-win-stat";
      readonly heroIds: readonly number[] | null;
      readonly stat: "hero_damage" | "kills";
      readonly minimum: number;
    };

export type StarRaceQuestDefinition = {
  readonly dateKey: string;
  readonly weekday: string;
  readonly dateLabel: string;
  readonly title: string | null;
  readonly description: string | null;
  readonly rewardStars: number | null;
  readonly requirement: StarRaceQuestRequirement | null;
};

export const STAR_RACE_QUESTS: readonly StarRaceQuestDefinition[] = [
  {
    dateKey: "2026-08-10",
    weekday: "Понедельник",
    dateLabel: "10 августа",
    title: "Легенда СНГ",
    description:
      "Выиграйте рейтинговые матчи на двух разных героях из пика Team Spirit с последней карты The International 2021.",
    rewardStars: 2,
    requirement: {
      kind: "distinct-hero-wins",
      requiredDistinctWins: 2,
      heroIds: [97, 3, 112, 106, 109],
    },
  },
  {
    dateKey: "2026-08-11",
    weekday: "Вторник",
    dateLabel: "11 августа",
    title: "Побеждает тот, у кого упадёт трон",
    description:
      "Нанесите 30 000 урона по строениям. Прогресс засчитывается только в победных матчах и суммируется за все игры в рамках суток.",
    rewardStars: 2,
    requirement: {
      kind: "winning-building-damage",
      targetDamage: 30_000,
    },
  },
  {
    dateKey: "2026-08-12",
    weekday: "Среда",
    dateLabel: "12 августа",
    title: "Это снайпер?",
    description:
      "Выиграть рейтинговый матч на Pudge, нанеся 60 000 урона героям.",
    rewardStars: 2,
    requirement: {
      kind: "ranked-win-stat",
      heroIds: [14],
      stat: "hero_damage",
      minimum: 60_000,
    },
  },
  {
    dateKey: "2026-08-13",
    weekday: "Четверг",
    dateLabel: "13 августа",
    title: "Пакистанский король",
    description:
      "Повтори рекорд Suma1L хотя бы наполовину. Выиграть рейтинговый матч на любом герое, сделав 16 убийств.",
    rewardStars: 2,
    requirement: {
      kind: "ranked-win-stat",
      heroIds: null,
      stat: "kills",
      minimum: 16,
    },
  },
  {
    dateKey: "2026-08-14",
    weekday: "Пятница",
    dateLabel: "14 августа",
    title: "Welcome to The International!",
    description:
      "Выиграть одну рейтинговую игру на одном из любимых героев Гейба Ньюэлла — Sand King или Weaver.",
    rewardStars: 2,
    requirement: {
      kind: "distinct-hero-wins",
      requiredDistinctWins: 1,
      heroIds: [16, 63],
    },
  },
  {
    dateKey: "2026-08-15",
    weekday: "Суббота",
    dateLabel: "15 августа",
    title: "Чемпионы прошлого Шанхайского The International",
    description:
      "Выиграть на 1 из 5 героев из пика OG с последней карты The International 2019.",
    rewardStars: 2,
    requirement: {
      kind: "distinct-hero-wins",
      requiredDistinctWins: 1,
      heroIds: [91, 19, 102, 98, 72],
    },
  },
  {
    dateKey: "2026-08-16",
    weekday: "Воскресенье",
    dateLabel: "16 августа",
    title: null,
    description: null,
    rewardStars: null,
    requirement: null,
  },
];

export type StarRaceQuestWin = {
  hero: CompendiumHero;
  matchId: string;
};

export type StarRaceQuestCompletion = {
  completedAt: string;
  wins: StarRaceQuestWin[];
};

export type StarRaceQuestProgress = {
  current: number;
  target: number;
  checkedAt: string | null;
};

export type StarRaceQuest = StarRaceQuestDefinition & {
  startsAt: string;
  endsAt: string;
  phase: StarRaceQuestPhase;
  heroes: CompendiumHero[];
  completion: StarRaceQuestCompletion | null;
  progress: StarRaceQuestProgress | null;
};

export type StarRaceData = {
  phase: StarRacePhase;
  isDetailsVisible: boolean;
  startsAt: string;
  endsAt: string;
  totalStars: number | null;
  personalRank: number | null;
  prizes: readonly StarRacePrize[];
  quests: StarRaceQuest[];
};

export function starRacePhase(now: Date, isOrganizer: boolean) {
  const currentTime = now.getTime();
  const startsAt = new Date(STAR_RACE_START_AT).getTime();
  const endsAt = new Date(STAR_RACE_END_AT).getTime();
  const phase: StarRacePhase =
    currentTime < startsAt
      ? "upcoming"
      : currentTime < endsAt
        ? "active"
        : "finished";
  return {
    phase,
    isDetailsVisible: isOrganizer || phase !== "upcoming",
  };
}

export function starRaceQuestPhase(
  quest: StarRaceQuestDefinition,
  now: Date,
): StarRaceQuestPhase {
  const bounds = moscowDayBounds(quest.dateKey);
  if (now.getTime() < bounds.start.getTime()) return "upcoming";
  return now.getTime() < bounds.end.getTime() ? "active" : "finished";
}

export function starRaceQuestByDate(
  dateKey: string,
): StarRaceQuestDefinition | null {
  return STAR_RACE_QUESTS.find((quest) => quest.dateKey === dateKey) ?? null;
}

export function starRaceQuestHeroes(
  quest: StarRaceQuestDefinition,
): CompendiumHero[] {
  const requirement = quest.requirement;
  if (!requirement) return [];
  if (requirement.kind === "distinct-hero-wins") {
    return requirement.heroIds.map(compendiumHeroById);
  }
  if (requirement.kind === "ranked-win-stat" && requirement.heroIds) {
    return requirement.heroIds.map(compendiumHeroById);
  }
  return [];
}
