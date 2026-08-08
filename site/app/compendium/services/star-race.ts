import type { AuthUser } from "@/lib/auth";
import { CompendiumError } from "../model/errors";
import {
  findGameModeWin,
  findRankedStatWin,
  scanDistinctMatchingWins,
  scanWinningBuildingDamage,
} from "../model/matches";
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
  type StarRaceQuestHeroProgress,
  type StarRaceQuestProgress,
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
  loadStarRaceProgress,
  loadStarRaceRank,
  recordStarRaceCompletion,
  replaceStarRaceHeroProgress,
  replaceStarRaceProgress,
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
  const [totalStars, personalRank, completions, progresses] = await Promise.all([
    totalStarRaceStars(),
    loadStarRaceRank(user.discordId),
    loadStarRaceCompletions(user.discordId),
    loadStarRaceProgress(user.discordId),
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
      const savedProgress = progresses.get(quest.dateKey);
      return {
        ...quest,
        startsAt: bounds.start.toISOString(),
        endsAt: bounds.end.toISOString(),
        phase: starRaceQuestPhase(quest, now),
        heroes: starRaceQuestHeroes(quest),
        completion: completions.get(quest.dateKey) ?? null,
        progress: quest.requirement?.kind === "winning-building-damage"
          ? {
              current: savedProgress?.current ?? 0,
              target: quest.requirement.targetDamage,
              checkedAt: savedProgress?.checkedAt ?? null,
            }
          : null,
        heroProgress:
          quest.requirement?.kind === "distinct-hero-wins" &&
          quest.requirement.requiredDistinctWins > 1 &&
          savedProgress
            ? {
                checkedAt: savedProgress.checkedAt,
                wins: savedProgress.wins,
                target: quest.requirement.requiredDistinctWins,
              }
            : null,
      };
    }),
  };
}

export type CheckStarRaceQuestResult = {
  completion: StarRaceQuestCompletion | null;
  progress: StarRaceQuestProgress | null;
  heroProgress: StarRaceQuestHeroProgress | null;
  rewardStars: number;
  starRace: StarRaceData;
  totalStars: number;
  communityStars: number;
};

async function starRaceCheckResult(input: {
  user: AuthUser;
  dateKey: string;
  now: Date;
  completion: StarRaceQuestCompletion | null;
  rewardStars: number;
}): Promise<CheckStarRaceQuestResult> {
  const [starRace, totalStars, communityStars] = await Promise.all([
    loadStarRace(input.user, input.now),
    totalCompendiumStars(input.user.discordId),
    totalCommunityCompendiumStars(),
  ]);
  return {
    completion: input.completion,
    progress:
      starRace.quests.find((quest) => quest.dateKey === input.dateKey)
        ?.progress ?? null,
    heroProgress:
      starRace.quests.find((quest) => quest.dateKey === input.dateKey)
        ?.heroProgress ?? null,
    rewardStars: input.rewardStars,
    starRace,
    totalStars,
    communityStars,
  };
}

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
    !quest.requirement
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
    return starRaceCheckResult({
      user,
      dateKey,
      now,
      completion: completed,
      rewardStars: quest.rewardStars,
    });
  }
  if (!(await consumeCheckAllowance(user.discordId))) {
    throw new CompendiumError(
      "RATE_LIMITED",
      "Слишком много проверок. Подождите минуту и попробуйте снова.",
    );
  }

  const matches = await fetchRecentPlayerMatches(dotaId, {
    forceRefresh: true,
  });
  const verificationNow = new Date();
  if (starRaceQuestPhase(quest, verificationNow) !== "active") {
    throw new CompendiumError(
      "STAR_RACE_NOT_ACTIVE",
      "Время выполнения задания уже закончилось.",
    );
  }
  const bounds = moscowDayBounds(dateKey);
  let completion: StarRaceQuestCompletion | null = null;
  if (quest.requirement.kind === "distinct-hero-wins") {
    const wins = scanDistinctMatchingWins({
      matches,
      heroIds: quest.requirement.heroIds,
      dayStart: bounds.start,
      dayEnd: bounds.end,
      now: verificationNow,
    });
    if (
      wins.length < quest.requirement.requiredDistinctWins &&
      quest.requirement.requiredDistinctWins === 1
    ) {
      throw new CompendiumError(
        "NO_MATCH",
        "Пока не найдена победа на герое задания за текущие сутки по Москве.",
      );
    }
    if (wins.length < quest.requirement.requiredDistinctWins) {
      await replaceStarRaceHeroProgress({
        playerId: user.discordId,
        dateKey,
        wins,
      });
    } else {
      completion = await recordStarRaceCompletion({
        playerId: user.discordId,
        dateKey,
        rewardStars: quest.rewardStars,
        wins: wins.slice(0, quest.requirement.requiredDistinctWins),
      });
    }
  } else if (quest.requirement.kind === "winning-building-damage") {
    const scan = scanWinningBuildingDamage({
      matches,
      dayStart: bounds.start,
      dayEnd: bounds.end,
      now: verificationNow,
    });
    await replaceStarRaceProgress({
      playerId: user.discordId,
      dateKey,
      current: scan.totalDamage,
    });
    if (scan.totalDamage >= quest.requirement.targetDamage) {
      const evidenceWin = scan.wins[0];
      if (!evidenceWin) {
        throw new Error("Completed building damage scan has no winning match");
      }
      completion = await recordStarRaceCompletion({
        playerId: user.discordId,
        dateKey,
        rewardStars: quest.rewardStars,
        wins: [evidenceWin],
      });
    }
  } else if (quest.requirement.kind === "ranked-win-stat") {
    const win = findRankedStatWin({
      matches,
      heroIds: quest.requirement.heroIds,
      stat: quest.requirement.stat,
      minimum: quest.requirement.minimum,
      dayStart: bounds.start,
      dayEnd: bounds.end,
      now: verificationNow,
    });
    if (!win) {
      const target = quest.requirement.stat === "hero_damage"
        ? `${quest.requirement.minimum.toLocaleString("ru-RU")} урона героям`
        : `${quest.requirement.minimum} убийств`;
      throw new CompendiumError(
        "NO_MATCH",
        `Пока не найден победный рейтинговый матч с результатом: ${target}.`,
      );
    }
    completion = await recordStarRaceCompletion({
      playerId: user.discordId,
      dateKey,
      rewardStars: quest.rewardStars,
      wins: [win],
    });
  } else {
    const win = findGameModeWin({
      matches,
      gameMode: quest.requirement.gameMode,
      dayStart: bounds.start,
      dayEnd: bounds.end,
      now: verificationNow,
    });
    if (!win) {
      throw new CompendiumError(
        "NO_MATCH",
        "Пока не найдена победа в режиме Turbo за текущие сутки по Москве.",
      );
    }
    completion = await recordStarRaceCompletion({
      playerId: user.discordId,
      dateKey,
      rewardStars: quest.rewardStars,
      wins: [win],
    });
  }
  return starRaceCheckResult({
    user,
    dateKey,
    now: verificationNow,
    completion,
    rewardStars: quest.rewardStars,
  });
}
