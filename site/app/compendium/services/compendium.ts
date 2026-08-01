import type { AuthUser } from "@/lib/auth";
import { normalizeDotaAccountId } from "@/lib/player-profile";
import {
  COMPENDIUM_TOURNAMENT_START_AT,
  NO_MATCH_MESSAGE,
  OPEN_DOTA_ERROR_MESSAGE,
} from "../model/constants";
import { CompendiumError } from "../model/errors";
import { findMatchingWin } from "../model/matches";
import { currentMoscowDay, moscowDateLabel } from "../model/time";
import type { CompendiumData, QuestCompletion } from "../model/types";
import { fetchRecentPlayerMatches } from "./opendota";
import {
  consumeCheckAllowance,
  ensureDailyQuestSet,
  existingCompletion,
  loadDailyQuests,
  questForCurrentDay,
  recordQuestCompletion,
  totalCompendiumStars,
  totalCommunityCompendiumStars,
} from "./repository";
import {
  dailyRerollsRemaining,
  recordDailyQuestReroll,
} from "./reroll-repository";

export type CheckQuestResult = {
  completion: QuestCompletion;
  totalStars: number;
  communityStars: number;
  rerollsRemaining: number;
  quests: CompendiumData["quests"];
};

export type RerollQuestResult = {
  quest: CompendiumData["quests"][number];
  rerollsRemaining: number;
};

function requireDotaId(user: AuthUser): string {
  const dotaId = normalizeDotaAccountId(user.dotaId);
  if (!dotaId) {
    throw new CompendiumError(
      "MISSING_DOTA_ID",
      "Сначала привяжите Dota ID в профиле участника",
    );
  }
  return dotaId;
}

export async function loadCompendium(
  user: AuthUser,
  now: Date = new Date(),
): Promise<CompendiumData> {
  const day = currentMoscowDay(now);
  await ensureDailyQuestSet(day.dateKey);
  const [quests, totalStars, communityStars, rerollsRemaining] = await Promise.all([
    loadDailyQuests(day.dateKey, user.discordId),
    totalCompendiumStars(user.discordId),
    totalCommunityCompendiumStars(),
    dailyRerollsRemaining(day.dateKey, user.discordId),
  ]);
  return {
    moscowDate: day.dateKey,
    moscowDateLabel: moscowDateLabel(day.dateKey),
    nextResetAt: day.end.toISOString(),
    tournamentStartsAt: COMPENDIUM_TOURNAMENT_START_AT,
    rerollsRemaining,
    totalStars,
    communityStars,
    hasDotaId: normalizeDotaAccountId(user.dotaId) !== null,
    quests,
  };
}

export async function checkDailyQuest(
  user: AuthUser,
  questId: string,
  now: Date = new Date(),
): Promise<CheckQuestResult> {
  const dotaId = requireDotaId(user);

  const day = currentMoscowDay(now);
  await ensureDailyQuestSet(day.dateKey);
  const quest = await questForCurrentDay(
    questId,
    day.dateKey,
    user.discordId,
  );
  if (!quest) {
    throw new CompendiumError("STALE_QUEST", "Задание больше не действует");
  }
  const completed = await existingCompletion(user.discordId, questId);
  if (completed) {
    const [totalStars, communityStars, rerollsRemaining, quests] =
      await Promise.all([
        totalCompendiumStars(user.discordId),
        totalCommunityCompendiumStars(),
        dailyRerollsRemaining(day.dateKey, user.discordId),
        loadDailyQuests(day.dateKey, user.discordId),
      ]);
    return {
      completion: completed,
      totalStars,
      communityStars,
      rerollsRemaining,
      quests,
    };
  }

  if (!(await consumeCheckAllowance(user.discordId))) {
    console.warn("Repeated compendium checks were rate limited", {
      playerId: user.discordId,
      questId,
    });
    throw new CompendiumError(
      "RATE_LIMITED",
      "Слишком много проверок. Подождите минуту и попробуйте снова.",
    );
  }

  let matches;
  try {
    matches = await fetchRecentPlayerMatches(dotaId);
  } catch (error) {
    if (
      error instanceof CompendiumError &&
      error.code === "OPEN_DOTA_UNAVAILABLE"
    ) {
      throw new CompendiumError("OPEN_DOTA_UNAVAILABLE", OPEN_DOTA_ERROR_MESSAGE);
    }
    throw error;
  }

  const verificationNow = new Date();
  const currentDayAfterRequest = currentMoscowDay(verificationNow);
  if (currentDayAfterRequest.dateKey !== day.dateKey) {
    throw new CompendiumError("STALE_QUEST", "Задание больше не действует");
  }
  const matchingWin = findMatchingWin({
    matches,
    heroIds: quest.heroIds,
    dayStart: day.start,
    dayEnd: day.end,
    now: verificationNow,
  });
  if (!matchingWin) {
    throw new CompendiumError("NO_MATCH", NO_MATCH_MESSAGE);
  }

  const completion = await recordQuestCompletion({
    playerId: user.discordId,
    questId,
    heroId: matchingWin.heroId,
    matchId: matchingWin.matchId,
  });
  const [totalStars, communityStars, rerollsRemaining, quests] =
    await Promise.all([
      totalCompendiumStars(user.discordId),
      totalCommunityCompendiumStars(),
      dailyRerollsRemaining(day.dateKey, user.discordId),
      loadDailyQuests(day.dateKey, user.discordId),
    ]);
  return {
    completion,
    totalStars,
    communityStars,
    rerollsRemaining,
    quests,
  };
}

export async function rerollDailyQuest(
  user: AuthUser,
  questId: string,
  now: Date = new Date(),
): Promise<RerollQuestResult> {
  requireDotaId(user);
  const day = currentMoscowDay(now);
  await ensureDailyQuestSet(day.dateKey);
  await recordDailyQuestReroll({
    playerId: user.discordId,
    questId,
    dateKey: day.dateKey,
  });
  const quests = await loadDailyQuests(day.dateKey, user.discordId);
  const quest = quests.find((item) => item.id === questId);
  if (!quest) {
    throw new CompendiumError("STALE_QUEST", "Задание больше не действует");
  }
  return {
    quest,
    rerollsRemaining: await dailyRerollsRemaining(day.dateKey, user.discordId),
  };
}
