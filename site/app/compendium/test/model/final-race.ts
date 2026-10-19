import { TEST_RACE_WEEK, testDayBounds } from "./config";
import { compendiumHeroById } from "../../model/heroes";
import type { StarRaceData, StarRaceQuest } from "../../model/star-race";

export const FINAL_RACE_PREVIEW_WEEK = TEST_RACE_WEEK;
export { FINAL_RACE_PATHS, finalRaceReward as finalRacePreviewReward, type FinalRacePath } from "../../model/final-star-race-definitions";
import { FINAL_RACE_PATHS, finalRaceReward as finalRacePreviewReward, coreChallenges, supportChallenges, type FinalRacePath } from "../../model/final-star-race-definitions";

export type FinalRacePreviewState = { path: FinalRacePath | null; activeDay: number; completedDays: readonly number[]; selectedDay?: number };
export const INITIAL_FINAL_RACE_PREVIEW: FinalRacePreviewState = { path: null, activeDay: 0, completedDays: [] };
export type FinalRacePreviewAction =
  | { type: "choose-path"; path: FinalRacePath }
  | { type: "set-day"; day: number }
  | { type: "complete"; dateKey: string }
  | { type: "reset" };

/** Local sandbox transitions. No live quest or reward service is called. */
export function finalRacePreviewReducer(state: FinalRacePreviewState, action: FinalRacePreviewAction): FinalRacePreviewState {
  if (action.type === "reset") return INITIAL_FINAL_RACE_PREVIEW;
  if (action.type === "choose-path") return state.path === null ? { ...state, path: action.path, selectedDay: state.activeDay } : state;
  if (!state.path) return state;
  if (action.type === "set-day") return Number.isInteger(action.day) && action.day >= 0 && action.day < FINAL_RACE_PREVIEW_WEEK.quests.length
    ? { ...state, activeDay: action.day } : state;
  const activeDate = FINAL_RACE_PREVIEW_WEEK.quests[state.activeDay].dateKey;
  return state.activeDay >= (state.selectedDay ?? 0) && action.dateKey === activeDate && !state.completedDays.includes(state.activeDay)
    ? { ...state, completedDays: [...state.completedDays, state.activeDay] } : state;
}


/** Uses shared quest conditions with an isolated calendar, progress and rewards. */
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
      phase: index < (state.selectedDay ?? 0) ? "finished" : index === state.activeDay ? "active" : index < state.activeDay ? "finished" : "upcoming",
      heroes, progress: requirement?.kind === "winning-building-damage"
        ? { current: isCompleted ? requirement.targetDamage : 12_500, target: requirement.targetDamage, checkedAt: null }
        : (requirement?.kind === "cumulative-assists" || requirement?.kind === "cumulative-net-worth")
          ? { current: isCompleted ? requirement.target : requirement.kind === "cumulative-net-worth" ? 30_000 : 17, target: requirement.target, checkedAt: null } : null,
      heroProgress: null, pendingVerification: null, finalPrediction: null,
      completion: isCompleted ? { completedAt: bounds.start.toISOString(), wins: [], isManual: false } : null,
    };
  });
  const race: StarRaceData = {
    ...FINAL_RACE_PREVIEW_WEEK, title: path.raceTitle, phase: "active", isDetailsVisible: true,
    personalStars: state.completedDays.reduce((sum, day) => sum + finalRacePreviewReward(day), 0), personalRank: null, quests,
  };
  return { race, path, currentTimeMs: Date.parse(quests[state.activeDay].startsAt) + 12 * 60 * 60 * 1000 };
}
