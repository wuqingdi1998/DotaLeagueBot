import { TEST_RACE_WEEK, testDayBounds } from "./config";
import { compendiumHeroById } from "../../model/heroes";
import type { StarRaceData, StarRaceQuest, StarRaceQuestRequirement } from "../../model/star-race";

export const FINAL_RACE_PREVIEW_WEEK = TEST_RACE_WEEK;
export type FinalRacePath = "core" | "support";
export const FINAL_RACE_PATHS = [
  { id: "core", title: "Путь Разрушения (Core)", description: "Урон, натиск и решающий удар", image: "/compendium/october/path-destruction.webp" },
  { id: "support", title: "Путь Созидания (Support)", description: "Лечение, поддержка и сила команды", image: "/compendium/october/path-creation.webp" },
] as const;

type PreviewChallenge = { title: string; description: string; requirement?: StarRaceQuestRequirement };

const coreChallenges: readonly PreviewChallenge[] = [
  { title: "Десятка", description: "10 убийств за один матч." },
  { title: "До трона", description: "25 000 урона строениям за день.", requirement: { kind: "winning-building-damage", targetDamage: 25_000 } },
  { title: "Угроза", description: "30 000 урона героям за один матч." },
  { title: "Богатство", description: "650 золота в минуту за один матч." },
  { title: "Авангард", description: "Выиграйте матч на одном из героев ниже.", requirement: { kind: "distinct-hero-wins", requiredDistinctWins: 1, heroIds: [43, 72, 52, 129, 108, 63] } },
  { title: "Золотой темп", description: "Выиграйте матч с GPM не ниже 700 (золота в минуту)." },
  { title: "Идеалыч (почти)", description: "Выиграйте один матч, умерев не более 3 раз." },
];

const supportChallenges: readonly PreviewChallenge[] = [
  { title: "Помощь", description: "8 000 лечения союзников за день." },
  { title: "Команда", description: "20 содействий за один матч." },
  { title: "Живи!", description: "6 000 лечения союзников за один матч." },
  { title: "Рядом", description: "35 содействий за день." },
  { title: "Хранители", description: "Выиграйте матч на одном из героев ниже.", requirement: { kind: "distinct-hero-wins", requiredDistinctWins: 1, heroIds: [66, 103, 58, 155, 45, 79] } },
  { title: "Целитель", description: "Выиграйте один матч с лечением не менее 10 000." },
  { title: "Универсальный солдат", description: "Выиграйте один матч: не более 10 смертей и не менее 20 содействий." },
];

export type FinalRacePreviewState = { path: FinalRacePath | null; activeDay: number; completedDays: readonly number[] };
export const INITIAL_FINAL_RACE_PREVIEW: FinalRacePreviewState = { path: null, activeDay: 0, completedDays: [] };
export type FinalRacePreviewAction =
  | { type: "choose-path"; path: FinalRacePath }
  | { type: "set-day"; day: number }
  | { type: "complete"; dateKey: string }
  | { type: "reset" };

/** Local sandbox transitions. No live quest or reward service is called. */
export function finalRacePreviewReducer(state: FinalRacePreviewState, action: FinalRacePreviewAction): FinalRacePreviewState {
  if (action.type === "reset") return INITIAL_FINAL_RACE_PREVIEW;
  if (action.type === "choose-path") return state.path === null && state.activeDay === 0 ? { ...state, path: action.path } : state;
  if (!state.path) return state;
  if (action.type === "set-day") return Number.isInteger(action.day) && action.day >= 0 && action.day < FINAL_RACE_PREVIEW_WEEK.quests.length
    ? { ...state, activeDay: action.day } : state;
  const activeDate = FINAL_RACE_PREVIEW_WEEK.quests[state.activeDay].dateKey;
  return action.dateKey === activeDate && !state.completedDays.includes(state.activeDay)
    ? { ...state, completedDays: [...state.completedDays, state.activeDay] } : state;
}

export function finalRacePreviewReward(day: number): number { return day === FINAL_RACE_PREVIEW_WEEK.quests.length - 1 ? 5 : 4; }

/** Private sample conditions and progress; the real final-week definitions stay untouched. */
export function finalRacePreviewData(state: FinalRacePreviewState) {
  if (state.path === null) return null;
  const path = FINAL_RACE_PATHS.find((option) => option.id === state.path)!;
  const challenges = state.path === "core" ? coreChallenges : supportChallenges;
  const quests: StarRaceQuest[] = FINAL_RACE_PREVIEW_WEEK.quests.map((definition, index) => {
    const bounds = testDayBounds(index);
    const isCompleted = state.completedDays.includes(index);
    const requirement = challenges[index].requirement ?? null;
    const heroes = requirement?.kind === "distinct-hero-wins"
      ? requirement.heroIds.map(compendiumHeroById).sort((left, right) => left.name.localeCompare(right.name, "en")) : [];
    return {
      ...definition, ...challenges[index], requirement, rewardStars: finalRacePreviewReward(index),
      weekday: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][index],
      startsAt: bounds.start.toISOString(), endsAt: bounds.end.toISOString(),
      phase: index === state.activeDay ? "active" : index < state.activeDay ? "finished" : "upcoming",
      heroes, progress: requirement?.kind === "winning-building-damage"
        ? { current: isCompleted ? requirement.targetDamage : 12_500, target: requirement.targetDamage, checkedAt: null } : null,
      heroProgress: null, pendingVerification: null, finalPrediction: null,
      completion: isCompleted ? { completedAt: bounds.start.toISOString(), wins: [], isManual: false } : null,
    };
  });
  const race: StarRaceData = {
    ...FINAL_RACE_PREVIEW_WEEK, phase: "active", isDetailsVisible: true,
    personalStars: state.completedDays.reduce((sum, day) => sum + finalRacePreviewReward(day), 0), personalRank: null, quests,
  };
  return { race, path, currentTimeMs: Date.parse(quests[state.activeDay].startsAt) + 12 * 60 * 60 * 1000 };
}
