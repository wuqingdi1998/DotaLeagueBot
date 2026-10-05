import {
  COMPENDIUM_END_AT,
  COMPENDIUM_FINAL_DATE,
} from "./constants";
import { CompendiumError } from "./errors";
import { currentMoscowDay } from "./time";
import {
  OCTOBER_COMPENDIUM_END_AT,
  OCTOBER_COMPENDIUM_START_AT,
} from "@/lib/october-compendium-schedule";

const compendiumEndTime = new Date(COMPENDIUM_END_AT).getTime();

export function isCompendiumFinished(now: Date = new Date()): boolean {
  return now.getTime() >= compendiumEndTime;
}

export function isCompendiumActive(now: Date = new Date()): boolean {
  const currentTime = now.getTime();
  return currentTime < compendiumEndTime || (
    currentTime >= Date.parse(OCTOBER_COMPENDIUM_START_AT) &&
    currentTime < Date.parse(OCTOBER_COMPENDIUM_END_AT)
  );
}

export function assertCompendiumActive(now: Date = new Date()): void {
  if (!isCompendiumActive(now)) {
    throw new CompendiumError(
      "COMPENDIUM_FINISHED",
      "Компендиум завершён. Задания и начисление звёзд остановлены.",
    );
  }
}

export function compendiumDisplayDateKey(now: Date = new Date()): string {
  return isCompendiumFinished(now)
    ? COMPENDIUM_FINAL_DATE
    : currentMoscowDay(now).dateKey;
}
