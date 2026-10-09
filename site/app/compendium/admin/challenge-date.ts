import { OCTOBER_COMPENDIUM_START_AT, OCTOBER_COMPENDIUM_END_AT } from "@/lib/october-compendium-schedule";
import { currentMoscowDay, moscowDateLabel } from "../model/time";
import { CompendiumError } from "../model/errors";

export function challengeDates(now = new Date()) {
  const today = currentMoscowDay(now).dateKey;
  const dates: Array<{ dateKey: string; label: string }> = [];
  for (let time = Date.parse(OCTOBER_COMPENDIUM_START_AT); time < Date.parse(OCTOBER_COMPENDIUM_END_AT); time += 86400000) {
    const dateKey = currentMoscowDay(new Date(time)).dateKey;
    if (dateKey <= today) dates.unshift({ dateKey, label: moscowDateLabel(dateKey) });
  }
  return dates;
}

export function assertChallengeDate(dateKey: string, now = new Date()) {
  if (!challengeDates(now).some((date) => date.dateKey === dateKey)) {
    throw new CompendiumError("STALE_QUEST", "Выберите прошедшую или текущую дату октябрьского компендиума");
  }
}

export function historicalRewardTime(dateKey: string, now = new Date()) {
  assertChallengeDate(dateKey, now);
  return new Date(Math.min(now.getTime(), Date.parse(`${dateKey}T23:59:59.999+03:00`))).toISOString();
}
