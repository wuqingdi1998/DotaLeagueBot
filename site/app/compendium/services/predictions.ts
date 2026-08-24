import type { AuthUser } from "@/lib/auth";
import { CompendiumError } from "../model/errors";
import { assertCompendiumActive } from "../model/lifecycle";
import { isPredictionScore, type PredictionScore } from "../model/predictions";
import { compendiumTeamByKey } from "../model/teams";
import { moscowDateKey } from "../model/time";
import {
  deletePredictionDay,
  deletePredictionMatch,
  recordPredictionPick,
  recordPredictionResult,
  relocatePredictionMatches,
  replacePredictionMatches,
  type PredictionMatchInput,
} from "./prediction-repository";

function isPredictionDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function submitPrediction(
  user: AuthUser,
  matchId: string,
  score: unknown,
  now: Date = new Date(),
) {
  assertCompendiumActive(now);
  if (!/^\d{1,19}$/.test(matchId) || !isPredictionScore(score)) {
    throw new CompendiumError("PREDICTION_INVALID", "Выберите допустимый счёт матча");
  }
  try {
    return await recordPredictionPick({ matchId, playerId: user.discordId, score, now });
  } catch (error) {
    if (error instanceof Error && error.message === "PREDICTION_NOT_OPEN") {
      throw new CompendiumError(
        "PREDICTION_NOT_OPEN",
        "Приём прогнозов на этот день ещё не открыт",
      );
    }
    if (error instanceof Error && error.message === "PREDICTION_LOCKED") {
      throw new CompendiumError("PREDICTION_LOCKED", "Приём прогнозов на этот матч уже завершён");
    }
    if (error instanceof Error && error.message === "PREDICTION_SCORE_INVALID") {
      throw new CompendiumError("PREDICTION_INVALID", "Выберите один из вариантов счёта этого матча");
    }
    if (error instanceof Error && error.message === "PREDICTION_NOT_FOUND") {
      throw new CompendiumError("PREDICTION_NOT_FOUND", "Матч для прогноза не найден");
    }
    throw error;
  }
}

export async function configurePredictionMatches(input: {
  administrator: AuthUser;
  sourceDateKey?: unknown;
  dateKey: string;
  opensAt: unknown;
  matches: Array<{ teamAKey?: unknown; teamBKey?: unknown; startsAt?: unknown }>;
  now?: Date;
}): Promise<void> {
  assertCompendiumActive(input.now);
  if (!isPredictionDateKey(input.dateKey)) {
    throw new CompendiumError("PREDICTION_INVALID", "Выберите дату матчей");
  }
  if (input.sourceDateKey !== undefined && !isPredictionDateKey(input.sourceDateKey)) {
    throw new CompendiumError("PREDICTION_INVALID", "Исходный день расписания не найден");
  }
  if (![2, 3].includes(input.matches.length)) {
    throw new CompendiumError("PREDICTION_INVALID", "На день можно сохранить два или три матча");
  }
  const opensAt = typeof input.opensAt === "string"
    ? new Date(input.opensAt)
    : new Date(NaN);
  if (Number.isNaN(opensAt.getTime())) {
    throw new CompendiumError(
      "PREDICTION_INVALID",
      "Укажите дату и время открытия прогнозов",
    );
  }
  const matches: PredictionMatchInput[] = input.matches.map((match, index) => {
    const teamA = typeof match.teamAKey === "string" ? compendiumTeamByKey(match.teamAKey) : null;
    const teamB = typeof match.teamBKey === "string" ? compendiumTeamByKey(match.teamBKey) : null;
    const startsAt = typeof match.startsAt === "string" ? new Date(match.startsAt) : new Date(NaN);
    const hasInvalidPair = !teamA || !teamB || teamA.key === teamB.key ||
      (teamA.key === "tbd" && teamB.key === "tbd");
    if (hasInvalidPair || Number.isNaN(startsAt.getTime())) {
      throw new CompendiumError("PREDICTION_INVALID", `Проверьте команды и время в матче ${index + 1}`);
    }
    if (moscowDateKey(startsAt) !== input.dateKey) {
      throw new CompendiumError("PREDICTION_INVALID", `Время матча ${index + 1} должно попадать в выбранный день`);
    }
    return {
      position: index + 1,
      startsAt,
      teamA: { key: teamA.key, name: teamA.name, logoPath: teamA.liquipediaLogoPath ?? "/tbd-team.svg" },
      teamB: { key: teamB.key, name: teamB.name, logoPath: teamB.liquipediaLogoPath ?? "/tbd-team.svg" },
    };
  });
  const firstMatchStartsAt = Math.min(
    ...matches.map((match) => match.startsAt.getTime()),
  );
  if (opensAt.getTime() >= firstMatchStartsAt) {
    throw new CompendiumError(
      "PREDICTION_INVALID",
      "Прогнозы должны открываться раньше первого матча дня",
    );
  }
  try {
    const schedule = {
      dateKey: input.dateKey,
      opensAt,
      administratorId: input.administrator.discordId,
      matches,
    };
    if (input.sourceDateKey && input.sourceDateKey !== input.dateKey) {
      await relocatePredictionMatches({
        ...schedule,
        sourceDateKey: input.sourceDateKey,
      });
    } else {
      await replacePredictionMatches(schedule);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "PREDICTION_RESULT_LOCKED") {
      throw new CompendiumError(
        "PREDICTION_LOCKED",
        "Завершённый матч нельзя удалить или заменить",
      );
    }
    if (error instanceof Error && error.message === "PREDICTION_TARGET_EXISTS") {
      throw new CompendiumError(
        "PREDICTION_INVALID",
        "На выбранную дату уже сохранено другое расписание",
      );
    }
    if (error instanceof Error && error.message === "PREDICTION_MATCH_COUNT_LOCKED") {
      throw new CompendiumError(
        "PREDICTION_LOCKED",
        "При переносе нельзя добавлять или удалять матчи — прогнозы должны сохраниться",
      );
    }
    if (error instanceof Error && error.message === "PREDICTION_PICKS_LOCKED") {
      throw new CompendiumError(
        "PREDICTION_LOCKED",
        "Нельзя убрать матч, на который участники уже сделали прогнозы",
      );
    }
    if (error instanceof Error && error.message === "PREDICTION_NOT_FOUND") {
      throw new CompendiumError("PREDICTION_NOT_FOUND", "Сохранённый день не найден");
    }
    throw error;
  }
}

export async function removePredictionSchedule(input: {
  matchId?: unknown;
  dateKey?: unknown;
  now?: Date;
}): Promise<{ deletedMatches: number }> {
  assertCompendiumActive(input.now);
  try {
    if (typeof input.matchId === "string" && /^\d{1,19}$/.test(input.matchId)) {
      await deletePredictionMatch(input.matchId);
      return { deletedMatches: 1 };
    }
    if (isPredictionDateKey(input.dateKey)) {
      return { deletedMatches: await deletePredictionDay(input.dateKey) };
    }
    throw new CompendiumError("PREDICTION_INVALID", "Выберите матч или день для удаления");
  } catch (error) {
    if (error instanceof Error && error.message === "PREDICTION_NOT_FOUND") {
      throw new CompendiumError("PREDICTION_NOT_FOUND", "Матч уже удалён или не найден");
    }
    throw error;
  }
}

export async function finishPredictionMatch(input: {
  administrator: AuthUser;
  matchId: string;
  score: unknown;
  now?: Date;
}): Promise<number> {
  assertCompendiumActive(input.now);
  if (!/^\d{1,19}$/.test(input.matchId) || !isPredictionScore(input.score)) {
    throw new CompendiumError("PREDICTION_INVALID", "Выберите итоговый счёт матча");
  }
  try {
    return await recordPredictionResult({
      matchId: input.matchId,
      score: input.score as PredictionScore,
      administratorId: input.administrator.discordId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PREDICTION_RESULT_LOCKED") {
      throw new CompendiumError("PREDICTION_LOCKED", "Результат этого матча уже был сохранён");
    }
    if (error instanceof Error && error.message === "PREDICTION_SCORE_INVALID") {
      throw new CompendiumError("PREDICTION_INVALID", "Выберите один из вариантов счёта этого матча");
    }
    if (error instanceof Error && error.message === "PREDICTION_NOT_FOUND") {
      throw new CompendiumError("PREDICTION_NOT_FOUND", "Матч не найден");
    }
    throw error;
  }
}
