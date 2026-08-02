import type { AuthUser } from "@/lib/auth";
import { CompendiumError } from "../model/errors";
import { isPredictionScore, type PredictionScore } from "../model/predictions";
import { compendiumTeamByKey } from "../model/teams";
import { moscowDateKey } from "../model/time";
import {
  recordPredictionPick,
  recordPredictionResult,
  replacePredictionMatches,
  type PredictionMatchInput,
} from "./prediction-repository";

export async function submitPrediction(
  user: AuthUser,
  matchId: string,
  score: unknown,
  now: Date = new Date(),
) {
  if (!/^\d{1,19}$/.test(matchId) || !isPredictionScore(score)) {
    throw new CompendiumError("PREDICTION_INVALID", "Выберите допустимый счёт матча");
  }
  try {
    return await recordPredictionPick({ matchId, playerId: user.discordId, score, now });
  } catch (error) {
    if (error instanceof Error && error.message === "PREDICTION_LOCKED") {
      throw new CompendiumError("PREDICTION_LOCKED", "Приём прогнозов на этот матч уже завершён");
    }
    if (error instanceof Error && error.message === "PREDICTION_NOT_FOUND") {
      throw new CompendiumError("PREDICTION_NOT_FOUND", "Матч для прогноза не найден");
    }
    throw error;
  }
}

export async function configurePredictionMatches(input: {
  administrator: AuthUser;
  dateKey: string;
  matches: Array<{ teamAKey?: unknown; teamBKey?: unknown; startsAt?: unknown }>;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateKey) || input.dateKey <= moscowDateKey(now)) {
    throw new CompendiumError("PREDICTION_DEADLINE", "Матчи нужно назначить не позднее 23:59 предыдущего дня");
  }
  if (input.matches.length !== 3) {
    throw new CompendiumError("PREDICTION_INVALID", "Нужно заполнить ровно три матча");
  }
  const matches: PredictionMatchInput[] = input.matches.map((match, index) => {
    const teamA = typeof match.teamAKey === "string" ? compendiumTeamByKey(match.teamAKey) : null;
    const teamB = typeof match.teamBKey === "string" ? compendiumTeamByKey(match.teamBKey) : null;
    const startsAt = typeof match.startsAt === "string" ? new Date(match.startsAt) : new Date(NaN);
    if (!teamA || !teamB || teamA.key === teamB.key || Number.isNaN(startsAt.getTime())) {
      throw new CompendiumError("PREDICTION_INVALID", `Проверьте команды и время в матче ${index + 1}`);
    }
    if (moscowDateKey(startsAt) !== input.dateKey) {
      throw new CompendiumError("PREDICTION_INVALID", `Время матча ${index + 1} должно попадать в выбранный день`);
    }
    return {
      position: index + 1,
      startsAt,
      teamA: { key: teamA.key, name: teamA.name, logoPath: teamA.liquipediaLogoPath },
      teamB: { key: teamB.key, name: teamB.name, logoPath: teamB.liquipediaLogoPath },
    };
  });
  try {
    await replacePredictionMatches({ dateKey: input.dateKey, administratorId: input.administrator.discordId, matches });
  } catch (error) {
    if (error instanceof Error && error.message === "PREDICTION_DEADLINE") {
      throw new CompendiumError("PREDICTION_DEADLINE", "Срок назначения матчей на этот день уже прошёл");
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
  if (!/^\d{1,19}$/.test(input.matchId) || !isPredictionScore(input.score)) {
    throw new CompendiumError("PREDICTION_INVALID", "Выберите итоговый счёт матча");
  }
  try {
    return await recordPredictionResult({
      matchId: input.matchId,
      score: input.score as PredictionScore,
      administratorId: input.administrator.discordId,
      now: input.now ?? new Date(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PREDICTION_RESULT_LOCKED") {
      throw new CompendiumError("PREDICTION_LOCKED", "Результат можно внести один раз после начала матча");
    }
    if (error instanceof Error && error.message === "PREDICTION_NOT_FOUND") {
      throw new CompendiumError("PREDICTION_NOT_FOUND", "Матч не найден");
    }
    throw error;
  }
}

