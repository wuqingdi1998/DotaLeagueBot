import { one, query } from "@/lib/db";
import {
  seasonCalendar,
  type SeasonCalendarEvent,
  type SeasonCalendarEventInput,
} from "@/lib/season-calendar";

type CalendarEventRow = {
  id: number;
  event_date: string;
  title: string;
  color: string;
};

function calendarEventFromRow(row: CalendarEventRow): SeasonCalendarEvent {
  return {
    id: row.id,
    date: row.event_date,
    title: row.title,
    color: row.color.toUpperCase(),
  };
}

export async function listSeasonCalendarEvents(): Promise<SeasonCalendarEvent[]> {
  const rows = await query<CalendarEventRow>(
    `SELECT id, event_date::text, title, color
     FROM season_calendar_events
     WHERE season_number = $1
       AND event_date BETWEEN $2::date AND $3::date
     ORDER BY event_date, id`,
    [seasonCalendar.seasonNumber, seasonCalendar.firstDate, seasonCalendar.lastDate],
  );
  return rows.map(calendarEventFromRow);
}

export async function createSeasonCalendarEvent(
  input: SeasonCalendarEventInput,
  organizerDiscordId: string,
): Promise<SeasonCalendarEvent> {
  const row = await one<CalendarEventRow>(
    `INSERT INTO season_calendar_events (
       season_number, event_date, title, color, created_by, updated_by
     )
     VALUES ($1, $2::date, $3, $4, $5, $5)
     RETURNING id, event_date::text, title, color`,
    [
      seasonCalendar.seasonNumber,
      input.date,
      input.title,
      input.color,
      organizerDiscordId,
    ],
  );
  if (!row) throw new Error("CALENDAR_EVENT_CREATE_FAILED");
  return calendarEventFromRow(row);
}

export async function updateSeasonCalendarEvent(
  id: number,
  input: SeasonCalendarEventInput,
  organizerDiscordId: string,
): Promise<SeasonCalendarEvent | null> {
  const row = await one<CalendarEventRow>(
    `UPDATE season_calendar_events
     SET event_date = $1::date,
         title = $2,
         color = $3,
         updated_by = $4,
         updated_at = NOW()
     WHERE id = $5 AND season_number = $6
     RETURNING id, event_date::text, title, color`,
    [
      input.date,
      input.title,
      input.color,
      organizerDiscordId,
      id,
      seasonCalendar.seasonNumber,
    ],
  );
  return row ? calendarEventFromRow(row) : null;
}

export async function deleteSeasonCalendarEvent(id: number): Promise<boolean> {
  const row = await one<{ id: number }>(
    `DELETE FROM season_calendar_events
     WHERE id = $1 AND season_number = $2
     RETURNING id`,
    [id, seasonCalendar.seasonNumber],
  );
  return Boolean(row);
}
