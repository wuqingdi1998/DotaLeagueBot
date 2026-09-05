"use client";

import { fetchSiteRequest } from "@/lib/site-request";

import { useState } from "react";
import type {
  SeasonCalendarEvent,
  SeasonCalendarEventInput,
} from "@/lib/season-calendar";

type CalendarEventResponse = {
  event?: SeasonCalendarEvent;
  error?: string;
};

async function calendarEventRequest(
  method: "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown>,
) {
  const response = await fetchSiteRequest("/api/calendar-events", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as CalendarEventResponse;
  if (!response.ok) {
    throw new Error(result.error ?? "Не удалось сохранить событие");
  }
  return result.event;
}

export function useCalendarEvents(initialEvents: SeasonCalendarEvent[]) {
  const [events, setEvents] = useState(initialEvents);

  async function saveEvent(
    input: SeasonCalendarEventInput,
    existingId: number | null,
  ) {
    const savedEvent = await calendarEventRequest(
      existingId ? "PATCH" : "POST",
      existingId ? { ...input, id: existingId } : input,
    );
    if (!savedEvent) throw new Error("Сервер не вернул сохранённое событие");
    setEvents((current) =>
      [...current.filter((event) => event.id !== savedEvent.id), savedEvent].sort(
        (left, right) => left.date.localeCompare(right.date) || left.id - right.id,
      ),
    );
    return savedEvent;
  }

  async function deleteEvent(id: number) {
    await calendarEventRequest("DELETE", { id });
    setEvents((current) => current.filter((event) => event.id !== id));
  }

  return { events, saveEvent, deleteEvent };
}
