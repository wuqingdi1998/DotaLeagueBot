import { COMPENDIUM_HEROES } from "../../model/heroes";
import type { DailyQuest } from "../../model/types";
import { INITIAL_FINAL_RACE_PREVIEW, finalRacePreviewData, finalRacePreviewReducer, type FinalRacePreviewAction, type FinalRacePreviewState } from "./final-race";
import { TEST_COMPENDIUM, testDayBounds } from "./config";

export type TestQuestKind = "daily-1" | "daily-2" | "outing" | "rune";
export type TestState = {
  race: FinalRacePreviewState; completed: readonly string[]; rerolls: Record<number, number>;
  heroOffsets: Record<string, number>; runeHeroId: number | null; hasRuneAccess: boolean; bonus: number;
};
export const INITIAL_TEST_STATE: TestState = { race: INITIAL_FINAL_RACE_PREVIEW, completed: [], rerolls: {}, heroOffsets: {}, runeHeroId: null, hasRuneAccess: true, bonus: 0 };
export type TestAction =
  | { type: "race"; action: FinalRacePreviewAction }
  | { type: "complete"; kind: TestQuestKind }
  | { type: "reroll"; position: 1 | 2 }
  | { type: "rune-hero"; heroId: number }
  | { type: "rune-access"; hasAccess: boolean }
  | { type: "bonus" }
  | { type: "reset" };

export function testReward(day: number) { return day >= 4 ? TEST_COMPENDIUM.weekendReward : TEST_COMPENDIUM.dailyReward; }
export function testCompletionKey(day: number, kind: TestQuestKind) { return `${day}:${kind}`; }
export function testTotals(state: TestState) {
  const raceStars = finalRacePreviewData(state.race)?.race.personalStars ?? 0;
  let daily = 0, rune = 0, partner = 0;
  for (const key of state.completed) {
    const [day, kind] = key.split(":");
    const stars = testReward(Number(day));
    if (kind === "rune") rune += stars;
    else { daily += stars; if (kind === "outing") partner += stars; }
  }
  return { personal: raceStars + daily + rune + state.bonus, weekly: raceStars + daily + state.bonus, partner };
}
export function testRerollsRemaining(state: TestState) {
  const stars = testTotals(state).personal;
  return 1 + Number(stars >= TEST_COMPENDIUM.firstReroll) + Number(stars >= TEST_COMPENDIUM.secondReroll) - (state.rerolls[state.race.activeDay] ?? 0);
}

/** The test reducer has no persistence or access to live services, identities or results. */
export function testReducer(state: TestState, action: TestAction): TestState {
  if (action.type === "reset") return INITIAL_TEST_STATE;
  if (action.type === "race") return { ...state, race: finalRacePreviewReducer(state.race, action.action) };
  if (action.type === "bonus") return { ...state, bonus: state.bonus + TEST_COMPENDIUM.bonusStars };
  if (action.type === "rune-access") return { ...state, hasRuneAccess: action.hasAccess };
  if (action.type === "rune-hero") return state.hasRuneAccess && COMPENDIUM_HEROES.some((hero) => hero.id === action.heroId)
    ? { ...state, runeHeroId: action.heroId } : state;
  const day = state.race.activeDay;
  if (action.type === "reroll") {
    const key = testCompletionKey(day, `daily-${action.position}`);
    if (testRerollsRemaining(state) <= 0 || state.completed.includes(key)) return state;
    return { ...state, rerolls: { ...state.rerolls, [day]: (state.rerolls[day] ?? 0) + 1 }, heroOffsets: { ...state.heroOffsets, [key]: (state.heroOffsets[key] ?? 0) + 6 } };
  }
  if (action.kind === "rune" && (!state.hasRuneAccess || state.runeHeroId === null)) return state;
  const key = testCompletionKey(day, action.kind);
  return state.completed.includes(key) ? state : { ...state, completed: [...state.completed, key] };
}

export function testDailyQuests(state: TestState): DailyQuest[] {
  return ([1, 2] as const).map((position) => {
    const day = state.race.activeDay;
    const key = testCompletionKey(day, `daily-${position}`);
    const offset = day * 12 + (position - 1) * 6 + (state.heroOffsets[key] ?? 0);
    const heroes = Array.from({ length: 6 }, (_, index) => COMPENDIUM_HEROES[(offset + index) % COMPENDIUM_HEROES.length]);
    return { id: `sandbox-${position}`, position, heroes, completion: state.completed.includes(key)
      ? { matchedHeroId: heroes[0].id, matchedMatchId: null, completedAt: testDayBounds(day).start.toISOString(), isManual: true } : null };
  });
}
