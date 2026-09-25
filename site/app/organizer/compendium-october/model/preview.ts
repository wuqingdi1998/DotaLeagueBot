import { HEROES_PER_QUEST } from "@/app/compendium/model/constants";
import { COMPENDIUM_HEROES } from "@/app/compendium/model/heroes";
import { starRaceQuestBounds, starRaceQuestHeroes, type StarRaceData } from "@/app/compendium/model/star-race";
import type { DailyQuest } from "@/app/compendium/model/types";
import type { OctoberCompendiumWeekDefinition } from "./plan";

export const OCTOBER_RACE_EXCLUSION_RULES = [
  "Звёзды за Испытание Рун не входят в недельную гонку, но пополняют личный зачёт и счёт клана.",
] as const;

export const OCTOBER_HERO_QUEST_COUNT = 2;
export const OCTOBER_CLAN_QUEST_POSITION = 3;

/** Illustrative cards only: actual daily hero sets are generated for each player after launch. */
export function octoberDailyQuestSamples(): DailyQuest[] {
  const heroes = COMPENDIUM_HEROES.slice(0, OCTOBER_HERO_QUEST_COUNT * HEROES_PER_QUEST);
  return Array.from({ length: OCTOBER_HERO_QUEST_COUNT }, (_, index) => ({
    id: `preview-${index + 1}`,
    position: index + 1,
    heroes: heroes.slice(index * HEROES_PER_QUEST, (index + 1) * HEROES_PER_QUEST),
    completion: null,
  }));
}

/** Adapts the private October plan to the existing, read-only race presentation. */
export function octoberRacePreviewData(week: OctoberCompendiumWeekDefinition): StarRaceData {
  return {
    id: week.id,
    title: week.title,
    dateLabel: week.dateLabel,
    phase: "upcoming",
    isDetailsVisible: true,
    startsAt: week.startsAt,
    endsAt: week.endsAt,
    personalStars: null,
    personalRank: null,
    prizes: week.prizes,
    quests: week.quests.map((quest) => {
      const bounds = starRaceQuestBounds(quest);
      return {
        ...quest,
        startsAt: bounds.start.toISOString(),
        endsAt: bounds.end.toISOString(),
        phase: "upcoming",
        heroes: starRaceQuestHeroes(quest),
        completion: null,
        progress: null,
        heroProgress: null,
        pendingVerification: null,
        finalPrediction: null,
      };
    }),
  };
}
