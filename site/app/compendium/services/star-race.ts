import type { AuthUser } from "@/lib/auth";
import { CompendiumError } from "../model/errors";
import { evaluateStarRaceRequirement } from "../model/star-race-evaluation";
import {
  starRaceForMoment,
  starRacePhase,
  starRaceQuestByDate,
  starRaceQuestBounds,
  starRaceQuestHeroes,
  starRaceQuestPhase,
  type StarRaceData,
  type StarRacePendingVerification,
  type StarRaceQuestCompletion,
  type StarRaceQuestHeroProgress,
  type StarRaceQuestProgress,
} from "../model/star-race";
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
  loadPersonalStarRaceStars,
  loadStarRaceProgress,
  loadStarRaceRank,
  recordStarRaceCompletion,
  replaceStarRaceHeroProgress,
  replaceStarRaceProgress,
} from "./star-race-repository";
import { checkStarRaceArcanaQuest } from "./star-race-arcana";
import { loadPendingArcanaVerifications } from "./star-race-arcana-repository";
import { loadFinalPrediction } from "./star-race-final-prediction-repository";

export async function loadStarRace(
  user: AuthUser,
  now: Date = new Date(),
): Promise<StarRaceData> {
  const race = starRaceForMoment(now);
  const visibility = starRacePhase(now, user.isAdmin, race);
  if (!visibility.isDetailsVisible) {
    return {
      ...visibility,
      id: race.id,
      title: race.title,
      dateLabel: race.dateLabel,
      startsAt: race.startsAt,
      endsAt: race.endsAt,
      personalStars: null,
      personalRank: null,
      prizes: race.prizes,
      quests: [],
    };
  }
  const [
    personalStars,
    personalRank,
    completions,
    progresses,
    pendingVerifications,
    finalPrediction,
  ] = await Promise.all([
    loadPersonalStarRaceStars(user.discordId, race),
    loadStarRaceRank(user.discordId, race),
    loadStarRaceCompletions(user.discordId),
    loadStarRaceProgress(user.discordId),
    loadPendingArcanaVerifications(user.discordId),
    loadFinalPrediction(user.discordId),
  ]);
  return {
    ...visibility,
    id: race.id,
    title: race.title,
    dateLabel: race.dateLabel,
    startsAt: race.startsAt,
    endsAt: race.endsAt,
    personalStars,
    personalRank,
    prizes: race.prizes,
    quests: race.quests.map((quest) => {
      const finalPredictionOpenedAt =
        quest.requirement?.kind === "final-winner-prediction"
          ? finalPrediction.openedAt
          : null;
      const bounds = starRaceQuestBounds(quest, finalPredictionOpenedAt);
      const savedProgress = progresses.get(quest.dateKey);
      return {
        ...quest,
        startsAt: bounds.start.toISOString(),
        endsAt: bounds.end.toISOString(),
        phase: starRaceQuestPhase(quest, now, finalPredictionOpenedAt),
        heroes: starRaceQuestHeroes(quest),
        completion: completions.get(quest.dateKey) ?? null,
        progress: quest.requirement?.kind === "winning-building-damage"
          ? {
              current: savedProgress?.current ?? 0,
              target: quest.requirement.targetDamage,
              checkedAt: savedProgress?.checkedAt ?? null,
            }
          : quest.requirement?.kind === "cumulative-ranked-win-stat"
            ? {
                current: savedProgress?.current ?? 0,
                target: quest.requirement.target,
                checkedAt: savedProgress?.checkedAt ?? null,
              }
          : quest.requirement?.kind === "ranked-wins"
            ? {
                current: savedProgress?.current ?? 0,
                target: quest.requirement.requiredWins,
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
        pendingVerification:
          pendingVerifications.get(quest.dateKey) ?? null,
        finalPrediction:
          quest.requirement?.kind === "final-winner-prediction"
            ? finalPrediction
            : null,
      };
    }),
  };
}

export type CheckStarRaceQuestResult = {
  completion: StarRaceQuestCompletion | null;
  progress: StarRaceQuestProgress | null;
  heroProgress: StarRaceQuestHeroProgress | null;
  pendingVerification: StarRacePendingVerification | null;
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
  pendingVerification?: StarRacePendingVerification | null;
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
    pendingVerification:
      input.pendingVerification ??
      starRace.quests.find((quest) => quest.dateKey === input.dateKey)
        ?.pendingVerification ?? null,
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
  if (quest.requirement.kind === "final-winner-prediction") {
    throw new CompendiumError(
      "PREDICTION_INVALID",
      "Для этого задания выберите команду в списке.",
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
  const bounds = starRaceQuestBounds(quest);
  const evaluation = evaluateStarRaceRequirement({
    requirement: quest.requirement,
    matches,
    dayStart: bounds.start,
    dayEnd: bounds.end,
    now: verificationNow,
  });
  if (quest.requirement.kind === "arcana-equipped-ranked-win") {
    const arcana = await checkStarRaceArcanaQuest({
      playerId: user.discordId,
      dotaId,
      dateKey,
      rewardStars: quest.rewardStars,
      wins: evaluation.wins,
      now: verificationNow,
    });
    return starRaceCheckResult({
      user,
      dateKey,
      now: verificationNow,
      completion: arcana.completion,
      rewardStars: quest.rewardStars,
      pendingVerification: arcana.pendingVerification,
    });
  }
  let completion: StarRaceQuestCompletion | null = null;
  if (quest.requirement.kind === "distinct-hero-wins") {
    if (
      !evaluation.isComplete &&
      quest.requirement.requiredDistinctWins === 1
    ) {
      throw new CompendiumError(
        "NO_MATCH",
        "Пока не найдена победа на герое задания за текущие сутки по Москве.",
      );
    }
    if (!evaluation.isComplete) {
      await replaceStarRaceHeroProgress({
        playerId: user.discordId,
        dateKey,
        wins: evaluation.wins,
      });
    } else {
      completion = await recordStarRaceCompletion({
        playerId: user.discordId,
        dateKey,
        rewardStars: quest.rewardStars,
        wins: evaluation.wins.slice(0, quest.requirement.requiredDistinctWins),
      });
    }
  } else if (quest.requirement.kind === "winning-building-damage") {
    await replaceStarRaceProgress({
      playerId: user.discordId,
      dateKey,
      current: evaluation.progress,
    });
    if (evaluation.isComplete) {
      const evidenceWin = evaluation.wins[0];
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
  } else if (quest.requirement.kind === "cumulative-ranked-win-stat") {
    await replaceStarRaceProgress({
      playerId: user.discordId,
      dateKey,
      current: evaluation.progress,
    });
    if (evaluation.isComplete) {
      completion = await recordStarRaceCompletion({
        playerId: user.discordId,
        dateKey,
        rewardStars: quest.rewardStars,
        wins: evaluation.wins,
      });
    }
  } else if (quest.requirement.kind === "ranked-wins") {
    await replaceStarRaceProgress({
      playerId: user.discordId,
      dateKey,
      current: evaluation.progress,
    });
    if (evaluation.isComplete) {
      completion = await recordStarRaceCompletion({
        playerId: user.discordId,
        dateKey,
        rewardStars: quest.rewardStars,
        wins: evaluation.wins.slice(0, quest.requirement.requiredWins),
      });
    }
  } else if (quest.requirement.kind === "ranked-win-stat") {
    const win = evaluation.wins[0];
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
    const win = evaluation.wins[0];
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
