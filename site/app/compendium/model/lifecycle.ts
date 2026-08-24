import {
  COMPENDIUM_END_AT,
  COMPENDIUM_FINAL_DATE,
} from "./constants";
import { CompendiumError } from "./errors";
import { currentMoscowDay } from "./time";

const compendiumEndTime = new Date(COMPENDIUM_END_AT).getTime();

export function isCompendiumFinished(now: Date = new Date()): boolean {
  return now.getTime() >= compendiumEndTime;
}

export function assertCompendiumActive(now: Date = new Date()): void {
  if (isCompendiumFinished(now)) {
    throw new CompendiumError(
      "COMPENDIUM_FINISHED",
      "Компендиум TI 2026 завершён. Задания и начисление звёзд остановлены.",
    );
  }
}

export function compendiumDisplayDateKey(now: Date = new Date()): string {
  return isCompendiumFinished(now)
    ? COMPENDIUM_FINAL_DATE
    : currentMoscowDay(now).dateKey;
}
