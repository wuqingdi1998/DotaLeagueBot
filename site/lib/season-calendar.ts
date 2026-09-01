export const seasonCalendar = {
  seasonNumber: 9,
  year: 2026,
  firstMonthIndex: 8,
  lastMonthIndex: 11,
  firstDate: "2026-09-01",
  lastDate: "2026-12-31",
} as const;

export const calendarEventTitleMaxLength = 80;

export const calendarEventColors = [
  "#00C3FF",
  "#7C5CFC",
  "#FFB020",
  "#F25F5C",
  "#21C98B",
  "#FF70A6",
] as const;

export type SeasonCalendarPeriod = {
  id: string;
  startDate: string;
  endDate: string;
  title: string;
  color: string;
};

export const seasonCalendarPeriods = [
  {
    id: "season-9-league-cup",
    startDate: "2026-11-02",
    endDate: "2026-12-13",
    title: "Linken's Sphere Esports League Cup Season 9",
    color: "#FF4057",
  },
] as const satisfies readonly SeasonCalendarPeriod[];

export const calendarWeekdayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const calendarMonthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

export type SeasonCalendarEvent = {
  id: number;
  date: string;
  title: string;
  color: string;
};

export type SeasonCalendarEventInput = Omit<SeasonCalendarEvent, "id">;

export type CalendarDay = {
  date: string | null;
  dayNumber: number | null;
  events: SeasonCalendarEvent[];
};

export type CalendarMonth = {
  monthIndex: number;
  name: string;
  days: CalendarDay[];
};

export type CalendarPeriodSegment = SeasonCalendarPeriod & {
  startRow: number;
  rowSpan: number;
  rowCount: number;
};

export class SeasonCalendarValidationError extends Error {}

function dateKey(year: number, monthIndex: number, day: number) {
  return [
    year,
    String(monthIndex + 1).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function eventsByDate(events: SeasonCalendarEvent[]) {
  return events.reduce<Map<string, SeasonCalendarEvent[]>>((grouped, event) => {
    const current = grouped.get(event.date) ?? [];
    current.push(event);
    grouped.set(event.date, current);
    return grouped;
  }, new Map());
}

export function buildSeasonCalendarMonths(
  events: SeasonCalendarEvent[],
): CalendarMonth[] {
  const groupedEvents = eventsByDate(events);
  return Array.from(
    {
      length:
        seasonCalendar.lastMonthIndex - seasonCalendar.firstMonthIndex + 1,
    },
    (_, monthOffset) => {
      const monthIndex = seasonCalendar.firstMonthIndex + monthOffset;
      const firstWeekday = new Date(
        Date.UTC(seasonCalendar.year, monthIndex, 1),
      ).getUTCDay();
      const mondayOffset = (firstWeekday + 6) % 7;
      const daysInMonth = new Date(
        Date.UTC(seasonCalendar.year, monthIndex + 1, 0),
      ).getUTCDate();
      const visibleWeekCount = Math.ceil((mondayOffset + daysInMonth) / 7);
      const days = Array.from(
        { length: visibleWeekCount * 7 },
        (_, cellIndex): CalendarDay => {
          const dayNumber = cellIndex - mondayOffset + 1;
          if (dayNumber < 1 || dayNumber > daysInMonth) {
            return { date: null, dayNumber: null, events: [] };
          }
          const date = dateKey(seasonCalendar.year, monthIndex, dayNumber);
          return {
            date,
            dayNumber,
            events: groupedEvents.get(date) ?? [],
          };
        },
      );
      return {
        monthIndex,
        name: calendarMonthNames[monthIndex],
        days,
      };
    },
  );
}

export function buildCalendarPeriodSegments(
  month: CalendarMonth,
  periods: readonly SeasonCalendarPeriod[] = seasonCalendarPeriods,
): CalendarPeriodSegment[] {
  const datedCells = month.days.filter(
    (day): day is CalendarDay & { date: string } => day.date !== null,
  );
  const firstDate = datedCells.at(0)?.date;
  const lastDate = datedCells.at(-1)?.date;
  if (!firstDate || !lastDate) return [];

  return periods.flatMap((period) => {
    if (period.endDate < firstDate || period.startDate > lastDate) return [];

    const startCellIndex =
      period.startDate <= firstDate
        ? 0
        : month.days.findIndex((day) => day.date === period.startDate);
    const endCellIndex =
      period.endDate >= lastDate
        ? month.days.length - 1
        : month.days.findIndex((day) => day.date === period.endDate);
    if (startCellIndex < 0 || endCellIndex < 0) return [];

    const startRow = Math.floor(startCellIndex / 7);
    const endRow = Math.floor(endCellIndex / 7);
    return [
      {
        ...period,
        startRow,
        rowSpan: endRow - startRow + 1,
        rowCount: month.days.length / 7,
      },
    ];
  });
}

export function parseSeasonCalendarEventInput(
  input: unknown,
): SeasonCalendarEventInput {
  if (!input || typeof input !== "object") {
    throw new SeasonCalendarValidationError("Заполните данные события");
  }
  const candidate = input as Record<string, unknown>;
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  const date = typeof candidate.date === "string" ? candidate.date : "";
  const color = typeof candidate.color === "string" ? candidate.color.toUpperCase() : "";

  if (!title) {
    throw new SeasonCalendarValidationError("Укажите название события");
  }
  if (title.length > calendarEventTitleMaxLength) {
    throw new SeasonCalendarValidationError(
      `Название должно быть не длиннее ${calendarEventTitleMaxLength} символов`,
    );
  }
  const parsedDate = new Date(`${date}T00:00:00Z`);
  const hasValidDateFormat =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === date;
  if (
    !hasValidDateFormat ||
    date < seasonCalendar.firstDate ||
    date > seasonCalendar.lastDate
  ) {
    throw new SeasonCalendarValidationError(
      "Выберите дату с сентября по декабрь 2026 года",
    );
  }
  if (!/^#[0-9A-F]{6}$/.test(color)) {
    throw new SeasonCalendarValidationError("Выберите корректный цвет события");
  }
  return { title, date, color };
}
