import { MOSCOW_TIME_ZONE } from "./moscow-date-time";

const recurringTimePattern = /^\d{2}:\d{2}(?::\d{2})?$/;

export function formatComputerTimeHint(
  value: string,
  timeZone?: string,
): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const timeZoneOption = timeZone ? { timeZone } : {};
  const time = new Intl.DateTimeFormat("ru-RU", {
    ...timeZoneOption,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  const calendarDate = new Intl.DateTimeFormat("ru-RU", {
    ...timeZoneOption,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return `${time} по времени на вашем ПК · ${calendarDate}`;
}

export function moscowRecurringTimeToIso(
  time: string,
  now: Date = new Date(),
): string {
  if (!recurringTimePattern.test(time)) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: MOSCOW_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${time}+03:00`;
}
