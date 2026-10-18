import { finalRaceQuests, finalRaceReservedHeroIds } from "./final-star-race-definitions";

const DAILY_QUEST_EXCLUDED_HERO_IDS: Readonly<Record<string, readonly number[]>> = {
  "2026-08-10": [97, 3, 112, 106, 109],
  "2026-08-12": [14],
  "2026-08-14": [16, 63],
  "2026-08-15": [91, 19, 102, 98, 72],
};

/** Heroes reserved for a star-race quest and unavailable in regular daily cards. */
export function dailyQuestExcludedHeroIds(dateKey: string): readonly number[] {
  const finalRaceDay = finalRaceQuests("core").findIndex((quest) => quest.dateKey === dateKey);
  return finalRaceDay >= 0
    ? finalRaceReservedHeroIds(finalRaceDay)
    : DAILY_QUEST_EXCLUDED_HERO_IDS[dateKey] ?? [];
}
