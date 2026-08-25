export const MOSCOW_TIME_ZONE = "Europe/Moscow";
const localDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;

export function toMoscowDateTimeInput(value: string | Date | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: MOSCOW_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function formatMoscowYear(value: string | Date): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    year: "numeric",
    timeZone: MOSCOW_TIME_ZONE,
  }).format(date);
}

export function moscowDateTimeInputToIso(value: unknown): string | null {
  if (!value) return null;
  const text = String(value).trim();
  const date = new Date(localDateTimePattern.test(text) ? `${text}+03:00` : text);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
