import { COMPENDIUM_TIME_ZONE } from "./constants";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: COMPENDIUM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: COMPENDIUM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function formattedParts(formatter: Intl.DateTimeFormat, date: Date) {
  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

export function moscowDateKey(now: Date = new Date()): string {
  const parts = formattedParts(dateFormatter, now);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function moscowDateLabel(dateKey: string): string {
  const instant = zonedMidnight(dateKey);
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: COMPENDIUM_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(instant);
}

function nextDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

function timeZoneOffsetMs(instant: Date): number {
  const parts = formattedParts(dateTimeFormatter, instant);
  const representedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return representedAsUtc - Math.floor(instant.getTime() / 1_000) * 1_000;
}

function zonedMidnight(dateKey: string): Date {
  const initialUtc = Date.parse(`${dateKey}T00:00:00.000Z`);
  let candidate = new Date(initialUtc - timeZoneOffsetMs(new Date(initialUtc)));
  candidate = new Date(initialUtc - timeZoneOffsetMs(candidate));
  return candidate;
}

export function moscowDayBounds(dateKey: string) {
  return {
    start: zonedMidnight(dateKey),
    end: zonedMidnight(nextDateKey(dateKey)),
  };
}

export function currentMoscowDay(now: Date = new Date()) {
  const dateKey = moscowDateKey(now);
  const bounds = moscowDayBounds(dateKey);
  return { dateKey, ...bounds };
}
