import type { AuthUser } from "@/lib/auth";
import { CompendiumError } from "../model/errors";
import { findDistinctMatchingWins } from "../model/matches";
import {
  STAR_RACE_END_AT,
  STAR_RACE_PRIZES,
  STAR_RACE_QUESTS,
  STAR_RACE_START_AT,
  starRacePhase,
  starRaceQuestByDate,
  starRaceQuestHeroes,
  starRaceQuestPhase,
  type StarRaceData,
  type StarRaceQuestCompletion,
} from "../model/star-race";
import { moscowDayBounds } from "../model/time";
import { fetchRecentPlayerMatches } from "./opendota";
import { requireCompendiumDotaId } from "./participant";
import {
  consumeCheckAllowance,
  totalCompendiumStars,
  totalCommunityCompendiumStars,
} from "./repository";
import {
  existingStarRaceCompletion,
  loadStarRaceCompletions,
  loadStarRaceRank,
  recordStarRaceCompletion,
  totalStarRaceStars,
} from "./star-race-repository";

export async function loadStarRace(
  user: AuthUser,
  now: Date = new Date(),
): Promise<StarRaceData> {
  const visibility = starRacePhase(now, user.isAdmin);
  if (!visibility.isDetailsVisible) {
    return {
      ...visibility,
      startsAt: STAR_RACE_START_AT,
      endsAt: STAR_RACE_END_AT,
      totalStars: null,
      personalRank: null,
      prizes: STAR_RACE_PRIZES,
      quests: [],
    };
  }
  const [totalStars, personalRank, completions] = await Promise.all([
    totalStarRaceStars(),
    loadStarRaceRank(user.discordId),
    loadStarRaceCompletions(user.discordId),
  ]);
  return {
    ...visibility,
    startsAt: STAR_RACE_START_AT,
    endsAt: STAR_RACE_END_AT,
    totalStars,
    personalRank,
    prizes: STAR_RACE_PRIZES,
    quests: STAR_RACE_QUESTS.map((quest) => {
      const bounds = moscowDayBounds(quest.dateKey);
      return {
        ...quest,
        startsAt: bounds.start.toISOString(),
        endsAt: bounds.end.toISOString(),
        phase: starRaceQuestPhase(quest, now),
        heroes: starRaceQuestHeroes(quest),
        completion: completions.get(quest.dateKey) ?? null,
      };
    }),
  };
}

export type CheckStarRaceQuestResult = {
  completion: StarRaceQuestCompletion;
  starRace: StarRaceData;
  totalStars: number;
  communityStars: number;
};

export async function checkStarRaceQuest(
  user: AuthUser,
  dateKey: string,
  now: Date = new Date(),
): Promise<CheckStarRaceQuestResult> {
  const dotaId = requireCompendiumDotaId(user);
  const quest = starRaceQuestByDate(dateKey);
  if (
    !quest ||
    !quest.title ||
    quest.rewardStars === null ||
    quest.requiredDistinctWins < 1
  ) {
    throw new CompendiumError(
      "QUEST_NOT_FOUND",
      "Задание для этого дня пока не задано.",
    );
  }
  if (starRaceQuestPhase(quest, now) !== "active") {
    throw new CompendiumError(
      "STAR_RACE_NOT_ACTIVE",
      "Задание доступно только в назначенный день по московскому времени.",
    );
  }
  const completed = await existingStarRaceCompletion(user.discordId, dateKey);
  if (completed) {
    const [starRace, totalStars, communityStars] = await Promise.all([
      loadStarRace(user, now),
      totalCompendiumStars(user.discordId),
      totalCommunityCompendiumStars(),
    ]);
    return { completion: completed, starRace, totalStars, communityStars };
  }
  if (!(await consumeCheckAllowance(user.discordId))) {
    throw new CompendiumError(
      "RATE_LIMITED",
      "Слишком много проверок. Подождите минуту и попробуйте снова.",
    );
  }

  const matches = await fetchRecentPlayerMatches(dotaId);
  const verificationNow = new Date();
  if (starRaceQuestPhase(quest, verificationNow) !== "active") {
    throw new CompendiumError(
      "STAR_RACE_NOT_ACTIVE",
      "Время выполнения задания уже закончилось.",
    );
  }
  const bounds = moscowDayBounds(dateKey);
  const wins = findDistinctMatchingWins({
    matches,
    heroIds: quest.heroIds,
    requiredDistinctWins: quest.requiredDistinctWins,
    dayStart: bounds.start,
    dayEnd: bounds.end,
    now: verificationNow,
  });
  if (!wins) {
    throw new CompendiumError(
      "NO_MATCH",
      `Пока не найдены победы на ${quest.requiredDistinctWins} разных героях задания за текущие сутки по Москве.`,
    );
  }
  const completion = await recordStarRaceCompletion({
    playerId: user.discordId,
    dateKey,
    rewardStars: quest.rewardStars,
    wins,
  });
  const [starRace, totalStars, communityStars] = await Promise.all([
    loadStarRace(user, verificationNow),
    totalCompendiumStars(user.discordId),
    totalCommunityCompendiumStars(),
  ]);
  return { completion, starRace, totalStars, communityStars };
}
