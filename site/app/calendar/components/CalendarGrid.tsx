import {
  buildSeasonCalendarMonths,
  calendarWeekdayLabels,
  seasonCalendar,
  type SeasonCalendarEvent,
} from "@/lib/season-calendar";

function eventAccessibleLabel(event: SeasonCalendarEvent) {
  const date = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${event.date}T00:00:00Z`));
  return `${date}: ${event.title}`;
}

export function CalendarGrid({ events }: { events: SeasonCalendarEvent[] }) {
  const months = buildSeasonCalendarMonths(events);

  return (
    <div className="season-calendar-grid">
      {months.map((month) => (
        <article className="season-calendar-month" key={month.monthIndex}>
          <header>
            <h2>{month.name}</h2>
            <span>{seasonCalendar.year}</span>
          </header>
          <div className="calendar-weekdays" aria-hidden="true">
            {calendarWeekdayLabels.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div
            className="calendar-days"
            role="grid"
            aria-label={`${month.name} ${seasonCalendar.year}`}
          >
            {month.days.map((day, cellIndex) => (
              <div
                className={day.date ? "calendar-day" : "calendar-day is-empty"}
                key={day.date ?? `empty-${cellIndex}`}
                role="gridcell"
              >
                {day.dayNumber && (
                  <>
                    <span className="calendar-day-number">{day.dayNumber}</span>
                    <span className="calendar-event-dots">
                      {day.events.map((event) => (
                        <button
                          className="calendar-event-dot"
                          key={event.id}
                          type="button"
                          style={{ backgroundColor: event.color }}
                          aria-label={eventAccessibleLabel(event)}
                          data-tooltip={event.title}
                        />
                      ))}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
