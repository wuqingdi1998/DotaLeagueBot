const tournamentTimeZone = "Europe/Moscow";
const dateSeparator = " — ";

const calendarDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: tournamentTimeZone,
});

const fullDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: tournamentTimeZone,
});

const dayMonthFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: tournamentTimeZone,
});

const shortDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: tournamentTimeZone,
});

const compactDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: tournamentTimeZone,
});

function tournamentCalendarDate(value: string) {
  return calendarDateFormatter.format(new Date(value));
}

function isSameTournamentDay(start: string, end: string) {
  return tournamentCalendarDate(start) === tournamentCalendarDate(end);
}

export function formatTournamentDateRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isSameTournamentDay(start, end)) {
    return fullDateFormatter.format(startDate);
  }
  if (
    tournamentCalendarDate(start).slice(0, 4) ===
    tournamentCalendarDate(end).slice(0, 4)
  ) {
    return `${dayMonthFormatter.format(startDate)}${dateSeparator}${fullDateFormatter.format(endDate)}`;
  }
  return `${fullDateFormatter.format(startDate)}${dateSeparator}${fullDateFormatter.format(endDate)}`;
}

export function formatTournamentDayMonthRange(start: string, end: string) {
  const formattedStart = dayMonthFormatter.format(new Date(start));
  if (isSameTournamentDay(start, end)) return formattedStart;
  return `${formattedStart}${dateSeparator}${dayMonthFormatter.format(new Date(end))}`;
}

export function formatTournamentShortDateRange(start: string, end: string) {
  const formattedStart = shortDateFormatter.format(new Date(start));
  if (isSameTournamentDay(start, end)) return formattedStart;
  return `${formattedStart}${dateSeparator}${shortDateFormatter.format(new Date(end))}`;
}

export function formatTournamentCompactDateRange(start: string, end: string) {
  const formattedStart = compactDateFormatter.format(new Date(start));
  if (isSameTournamentDay(start, end)) return formattedStart;
  return `${formattedStart}${dateSeparator}${compactDateFormatter.format(new Date(end))}`;
}
