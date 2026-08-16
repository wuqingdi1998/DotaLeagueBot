import type { AuthUser } from "@/lib/auth";
import { CompendiumError } from "../model/errors";
import { FINAL_PREDICTION_DATE, starRaceQuestByDate } from "../model/star-race";
import { requireCompendiumDotaId } from "./participant";
import {
  loadFinalPrediction,
  recordFinalPredictionWinner,
  saveFinalPredictionPick,
  saveFinalPredictionTeams,
} from "./star-race-final-prediction-repository";

function definition() {
  const quest = starRaceQuestByDate(FINAL_PREDICTION_DATE);
  if (
    !quest ||
    quest.requirement?.kind !== "final-winner-prediction" ||
    quest.rewardStars === null
  ) throw new Error("Final prediction quest is not configured");
  return { quest, requirement: quest.requirement };
}

function predictionError(error: unknown): never {
  if (!(error instanceof Error)) throw error;
  if (error.message === "PREDICTION_NOT_FOUND") {
    throw new CompendiumError("PREDICTION_NOT_FOUND", "Организатор ещё не добавил команды");
  }
  if (error.message === "PREDICTION_NOT_OPEN") {
    throw new CompendiumError("PREDICTION_NOT_OPEN", "Приём прогнозов ещё не открыт или ещё не завершён");
  }
  if (error.message === "PREDICTION_LOCKED") {
    throw new CompendiumError("PREDICTION_LOCKED", "Прогноз уже закрыт и не может быть изменён");
  }
  throw error;
}

export async function configureFinalPrediction(input: {
  administrator: AuthUser;
  teams: unknown;
  now?: Date;
}) {
  if (!Array.isArray(input.teams)) {
    throw new CompendiumError("PREDICTION_INVALID", "Укажите шесть команд");
  }
  const teams = input.teams.map((team) => typeof team === "string" ? team.trim() : "");
  if (teams.length !== 6 || teams.some((team) => !team) || new Set(teams.map((team) => team.toLocaleLowerCase("ru"))).size !== 6) {
    throw new CompendiumError("PREDICTION_INVALID", "Укажите шесть разных команд");
  }
  const { requirement } = definition();
  try {
    await saveFinalPredictionTeams({
      teams,
      administratorId: input.administrator.discordId,
      opensAt: new Date(requirement.opensAt),
      now: input.now ?? new Date(),
    });
    return loadFinalPrediction();
  } catch (error) {
    predictionError(error);
  }
}

export async function submitFinalPrediction(input: {
  user: AuthUser;
  position: unknown;
  now?: Date;
}) {
  requireCompendiumDotaId(input.user);
  if (!Number.isInteger(input.position) || Number(input.position) < 1 || Number(input.position) > 6) {
    throw new CompendiumError("PREDICTION_INVALID", "Выберите команду");
  }
  const { requirement } = definition();
  try {
    await saveFinalPredictionPick({
      playerId: input.user.discordId,
      position: Number(input.position),
      opensAt: new Date(requirement.opensAt),
      closesAt: new Date(requirement.closesAt),
      now: input.now ?? new Date(),
    });
    return loadFinalPrediction(input.user.discordId);
  } catch (error) {
    predictionError(error);
  }
}

export async function finishFinalPrediction(input: {
  administrator: AuthUser;
  position: unknown;
  now?: Date;
}) {
  if (!Number.isInteger(input.position) || Number(input.position) < 1 || Number(input.position) > 6) {
    throw new CompendiumError("PREDICTION_INVALID", "Выберите команду-победителя");
  }
  const { quest, requirement } = definition();
  try {
    return await recordFinalPredictionWinner({
      position: Number(input.position),
      administratorId: input.administrator.discordId,
      closesAt: new Date(requirement.closesAt),
      rewardStars: quest.rewardStars!,
      now: input.now ?? new Date(),
    });
  } catch (error) {
    predictionError(error);
  }
}
