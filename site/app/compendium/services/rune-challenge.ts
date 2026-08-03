import type { AuthUser } from "@/lib/auth";
import {
  OPEN_DOTA_ERROR_MESSAGE,
} from "../model/constants";
import { CompendiumError } from "../model/errors";
import { COMPENDIUM_HEROES, compendiumHeroById } from "../model/heroes";
import { findMatchingWin } from "../model/matches";
import { currentMoscowDay } from "../model/time";
import type { RuneChallengeData } from "../model/types";
import { fetchRecentPlayerMatches } from "./opendota";
import { requireCompendiumDotaId } from "./participant";
import {
  loadRuneChallengeStateRecord,
  recordRuneChallengeCompletion,
  saveRuneChallengeSelection,
  type RuneChallengeStateRecord,
} from "./rune-challenge-repository";
import {
  consumeCheckAllowance,
  totalCommunityCompendiumStars,
  totalCompendiumStars,
} from "./repository";

export type RuneChallengeCheckResult = {
  runeChallenge: RuneChallengeData;
  totalStars: number;
  communityStars: number;
};

function runeChallengeData(
  state: RuneChallengeStateRecord,
): RuneChallengeData {
  const hasAccess = state.accessRoleName !== null;
  return {
    hasAccess,
    accessRoleName: state.accessRoleName,
    selection: hasAccess && state.selection
      ? {
          hero: compendiumHeroById(state.selection.heroId),
          selectedAt: state.selection.selectedAt.toISOString(),
          nextChangeAt: state.selection.nextChangeAt.toISOString(),
          canChangeHero: state.selection.canChangeHero,
        }
      : null,
    completion: hasAccess ? state.completion : null,
  };
}

export async function loadRuneChallenge(
  playerId: string,
  dateKey: string,
): Promise<RuneChallengeData> {
  return runeChallengeData(
    await loadRuneChallengeStateRecord(playerId, dateKey),
  );
}

export async function selectRuneChallengeHero(
  user: AuthUser,
  heroId: number,
  now: Date = new Date(),
): Promise<RuneChallengeData> {
  requireCompendiumDotaId(user);
  if (!COMPENDIUM_HEROES.some((hero) => hero.id === heroId)) {
    throw new CompendiumError("RUNE_HERO_INVALID", "Выберите героя из списка");
  }
  await saveRuneChallengeSelection({ playerId: user.discordId, heroId });
  return loadRuneChallenge(user.discordId, currentMoscowDay(now).dateKey);
}

export async function checkRuneChallenge(
  user: AuthUser,
  now: Date = new Date(),
): Promise<RuneChallengeCheckResult> {
  const dotaId = requireCompendiumDotaId(user);
  const day = currentMoscowDay(now);
  let state = await loadRuneChallengeStateRecord(user.discordId, day.dateKey);
  if (!state.accessRoleName) {
    throw new CompendiumError(
      "RUNE_ACCESS_REQUIRED",
      "Испытание Рун недоступно для вашей текущей роли",
    );
  }
  if (!state.selection) {
    throw new CompendiumError(
      "RUNE_HERO_REQUIRED",
      "Сначала выберите любимого героя",
    );
  }
  if (!state.completion) {
    if (!(await consumeCheckAllowance(user.discordId))) {
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
        throw new CompendiumError(
          "OPEN_DOTA_UNAVAILABLE",
          OPEN_DOTA_ERROR_MESSAGE,
        );
      }
      throw error;
    }
    const verificationNow = new Date();
    const currentDayAfterRequest = currentMoscowDay(verificationNow);
    if (currentDayAfterRequest.dateKey !== day.dateKey) {
      throw new CompendiumError("STALE_QUEST", "Задание больше не действует");
    }
    state = await loadRuneChallengeStateRecord(user.discordId, day.dateKey);
    if (!state.accessRoleName || !state.selection) {
      throw new CompendiumError(
        "RUNE_ACCESS_REQUIRED",
        "Испытание Рун недоступно для вашей текущей роли",
      );
    }
    const matchingWin = findMatchingWin({
      matches,
      heroIds: [state.selection.heroId],
      dayStart: new Date(Math.max(
        day.start.getTime(),
        state.selection.selectedAt.getTime(),
      )),
      dayEnd: day.end,
      now: verificationNow,
    });
    if (!matchingWin) {
      throw new CompendiumError(
        "NO_MATCH",
        "Победа в рейтинговом матче на любимом герое пока не найдена",
      );
    }
    await recordRuneChallengeCompletion({
      playerId: user.discordId,
      dateKey: day.dateKey,
      heroId: state.selection.heroId,
      matchId: matchingWin.matchId,
    });
  }
  const [runeChallenge, totalStars, communityStars] = await Promise.all([
    loadRuneChallenge(user.discordId, day.dateKey),
    totalCompendiumStars(user.discordId),
    totalCommunityCompendiumStars(),
  ]);
  return { runeChallenge, totalStars, communityStars };
}
