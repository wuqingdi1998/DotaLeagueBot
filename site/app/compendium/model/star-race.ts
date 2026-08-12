import { compendiumHeroById } from "./heroes";
import { moscowDayBounds } from "./time";
import type { CompendiumHero } from "./types";

export type StarRacePrize = {
  readonly place: number;
  readonly title: string;
  readonly imageUrl: string;
};

const FIRST_STAR_RACE_PRIZES = [
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
] as const satisfies readonly StarRacePrize[];

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
    }
  | {
      readonly kind: "cumulative-ranked-win-stat";
      readonly heroIds: readonly number[];
      readonly stat: "hero_damage" | "kills";
      readonly target: number;
    }
  | {
      readonly kind: "game-mode-win";
      readonly gameMode: number;
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

const FIRST_STAR_RACE_QUESTS: readonly StarRaceQuestDefinition[] = [
  {
    dateKey: "2026-08-10",
    weekday: "Понедельник",
    dateLabel: "10 августа",
    title: "Легенда СНГ",
    description:
      "Выиграйте рейтинговый матч на одном из пяти героев из пика Team Spirit с последней карты The International 2021.",
    rewardStars: 2,
    requirement: {
      kind: "distinct-hero-wins",
      requiredDistinctWins: 1,
      heroIds: [97, 3, 112, 106, 109],
    },
  },
  {
    dateKey: "2026-08-11",
    weekday: "Вторник",
    dateLabel: "11 августа",
    title: "Побеждает тот, у кого упадёт трон",
    description:
      "Нанесите 30 000 урона по строениям. Прогресс засчитывается только в победных рейтинговых матчах и суммируется за все игры в рамках суток.",
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
      "Нанесите 40 000 урона по героям на Pudge или Sniper. Прогресс засчитывается только в победных рейтинговых матчах и суммируется за все игры в рамках суток.",
    rewardStars: 2,
    requirement: {
      kind: "cumulative-ranked-win-stat",
      heroIds: [14, 35],
      stat: "hero_damage",
      target: 40_000,
    },
  },
  {
    dateKey: "2026-08-13",
    weekday: "Четверг",
    dateLabel: "13 августа",
    title: "Пакистанский король",
    description:
      "Повтори рекорд Suma1L хотя бы наполовину. Выиграть рейтинговый матч на любом герое, сделав 15 и более убийств.",
    rewardStars: 2,
    requirement: {
      kind: "ranked-win-stat",
      heroIds: null,
      stat: "kills",
      minimum: 15,
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
      "Выиграть рейтинговый матч на 1 из 5 героев из пика OG с последней карты The International 2019.",
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
    title: "А разговоров то было...",
    description: "Выиграть одну игру в режиме Turbo.",
    rewardStars: 2,
    requirement: {
      kind: "game-mode-win",
      gameMode: 23,
    },
  },
];

export type StarRaceWeekDefinition = {
  readonly id: string;
  readonly title: string;
  readonly dateLabel: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly prizes: readonly StarRacePrize[];
  readonly quests: readonly StarRaceQuestDefinition[];
};

export const STAR_RACE_WEEKS: readonly StarRaceWeekDefinition[] = [
  {
    id: "2026-08-10",
    title: "Гонка за звёздами",
    dateLabel: "10–16 августа 2026",
    startsAt: "2026-08-10T00:00:00+03:00",
    endsAt: "2026-08-17T00:00:00+03:00",
    prizes: FIRST_STAR_RACE_PRIZES,
    quests: FIRST_STAR_RACE_QUESTS,
  },
];

export const CURRENT_STAR_RACE = STAR_RACE_WEEKS.at(-1)!;
export const STAR_RACE_START_AT = CURRENT_STAR_RACE.startsAt;
export const STAR_RACE_END_AT = CURRENT_STAR_RACE.endsAt;
export const STAR_RACE_PRIZES = CURRENT_STAR_RACE.prizes;
export const STAR_RACE_QUESTS = CURRENT_STAR_RACE.quests;

export function starRaceForMoment(
  now: Date,
  races: readonly StarRaceWeekDefinition[] = STAR_RACE_WEEKS,
): StarRaceWeekDefinition {
  const currentTime = now.getTime();
  const activeRace = races.find(
    (race) =>
      currentTime >= new Date(race.startsAt).getTime() &&
      currentTime < new Date(race.endsAt).getTime(),
  );
  if (activeRace) return activeRace;
  return races.find(
    (race) => currentTime < new Date(race.startsAt).getTime(),
  ) ?? races.at(-1)!;
}

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

export type StarRaceQuestHeroProgress = {
  checkedAt: string;
  wins: StarRaceQuestWin[];
  target: number;
};

export type StarRaceQuest = StarRaceQuestDefinition & {
  startsAt: string;
  endsAt: string;
  phase: StarRaceQuestPhase;
  heroes: CompendiumHero[];
  completion: StarRaceQuestCompletion | null;
  progress: StarRaceQuestProgress | null;
  heroProgress: StarRaceQuestHeroProgress | null;
};

export type StarRaceData = {
  id: string;
  title: string;
  dateLabel: string;
  phase: StarRacePhase;
  isDetailsVisible: boolean;
  startsAt: string;
  endsAt: string;
  personalStars: number | null;
  personalRank: number | null;
  prizes: readonly StarRacePrize[];
  quests: StarRaceQuest[];
};

export function starRacePhase(
  now: Date,
  isOrganizer: boolean,
  race: StarRaceWeekDefinition = CURRENT_STAR_RACE,
) {
  const currentTime = now.getTime();
  const startsAt = new Date(race.startsAt).getTime();
  const endsAt = new Date(race.endsAt).getTime();
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
  return starRaceWeekByDate(dateKey)?.quests.find(
    (quest) => quest.dateKey === dateKey,
  ) ?? null;
}

export function starRaceWeekByDate(
  dateKey: string,
): StarRaceWeekDefinition | null {
  return STAR_RACE_WEEKS.find(
    (race) => race.quests.some((quest) => quest.dateKey === dateKey),
  ) ?? null;
}

export function keepGroupedNumbersTogether(text: string): string {
  return text.replace(/(\d)[ \u00a0\u202f](?=\d{3}(?:\D|$))/g, "$1\u00a0");
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
  if (requirement.kind === "cumulative-ranked-win-stat") {
    return requirement.heroIds.map(compendiumHeroById);
  }
  return [];
}
