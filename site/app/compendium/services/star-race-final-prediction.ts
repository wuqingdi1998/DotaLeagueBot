import type { AuthUser } from "@/lib/auth";
import { CompendiumError } from "../model/errors";
import { assertCompendiumActive } from "../model/lifecycle";
import { FINAL_PREDICTION_DATE, starRaceQuestByDate } from "../model/star-race";
import { requireCompendiumDotaId } from "./participant";
import {
  loadFinalPrediction,
  recordFinalPredictionWinner,
  saveFinalPredictionPick,
  saveFinalPredictionTeams,
} from "./star-race-final-prediction-repository";

const finalPredictionNotification = {
  title: "Открылся финальный прогноз",
  message:
    "Финальное испытание «Гонки за звёздами» открыто. Выберите победителя турнира до 05:00 МСК 22 августа.",
};

function compendiumUrl(): string {
  const baseUrl = (process.env.PUBLIC_BASE_URL ?? "https://lsesports.ru")
    .replace(/\/+$/, "");
  return `${baseUrl}/compendium`;
}

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
  assertCompendiumActive(input.now);
  if (!Array.isArray(input.teams)) {
    throw new CompendiumError("PREDICTION_INVALID", "Укажите шесть команд");
  }
  const teams = input.teams.map((team) => typeof team === "string" ? team.trim() : "");
  if (teams.length !== 6 || teams.some((team) => !team) || new Set(teams.map((team) => team.toLocaleLowerCase("ru"))).size !== 6) {
    throw new CompendiumError("PREDICTION_INVALID", "Укажите шесть разных команд");
  }
  definition();
  try {
    const opening = await saveFinalPredictionTeams({
      teams,
      administratorId: input.administrator.discordId,
      notificationTitle: finalPredictionNotification.title,
      notificationMessage: finalPredictionNotification.message,
      actionUrl: compendiumUrl(),
      now: input.now ?? new Date(),
    });
    return {
      ...opening,
      prediction: await loadFinalPrediction(),
    };
  } catch (error) {
    predictionError(error);
  }
}

export async function submitFinalPrediction(input: {
  user: AuthUser;
  position: unknown;
  now?: Date;
}) {
  assertCompendiumActive(input.now);
  requireCompendiumDotaId(input.user);
  if (!Number.isInteger(input.position) || Number(input.position) < 1 || Number(input.position) > 6) {
    throw new CompendiumError("PREDICTION_INVALID", "Выберите команду");
  }
  const { requirement } = definition();
  try {
    await saveFinalPredictionPick({
      playerId: input.user.discordId,
      position: Number(input.position),
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
  assertCompendiumActive(input.now);
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
