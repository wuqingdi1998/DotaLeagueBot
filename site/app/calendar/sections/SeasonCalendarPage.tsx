"use client";

import dynamic from "next/dynamic";
import { FiCalendar, FiInfo } from "react-icons/fi";
import { CalendarGrid } from "../components/CalendarGrid";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import type { SeasonCalendarEvent } from "@/lib/season-calendar";

const CalendarEventEditor = dynamic(
  () =>
    import("../admin/CalendarEventEditor").then(
      (module) => module.CalendarEventEditor,
    ),
  { ssr: false },
);

export function SeasonCalendarPage({
  initialEvents,
  isOrganizer,
}: {
  initialEvents: SeasonCalendarEvent[];
  isOrganizer: boolean;
}) {
  const { events, saveEvent, deleteEvent } = useCalendarEvents(initialEvents);

  return (
    <>
      <section className="calendar-hero">
        <div className="calendar-hero-icon" aria-hidden="true">
          <FiCalendar />
        </div>
        <div>
          <p>Linken&apos;s Sphere Esports</p>
          <h1>Календарь 9-го сезона</h1>
          <span>Сентябрь — декабрь 2026</span>
        </div>
      </section>

      <section className="calendar-content">
        <div className="calendar-hint">
          <FiInfo aria-hidden="true" />
          <span>
            Наведите на закрашенную половину дня, чтобы увидеть название события.
          </span>
        </div>
        <CalendarGrid events={events} />
        {isOrganizer && (
          <CalendarEventEditor
            events={events}
            onSave={saveEvent}
            onDelete={deleteEvent}
          />
        )}
      </section>
    </>
  );
}
