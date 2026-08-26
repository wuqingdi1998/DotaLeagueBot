import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import {
  parseSeasonCalendarEventInput,
  SeasonCalendarValidationError,
} from "@/lib/season-calendar";
import {
  createSeasonCalendarEvent,
  deleteSeasonCalendarEvent,
  updateSeasonCalendarEvent,
} from "@/app/calendar/services/calendar-events";

function parseEventId(input: unknown) {
  const id = Number(input);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function calendarErrorResponse(error: unknown) {
  if (error instanceof SeasonCalendarValidationError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  return responseFromAuthError(error);
}

export async function POST(request: Request) {
  try {
    const organizer = await requireAdmin();
    const input = parseSeasonCalendarEventInput(await request.json());
    const event = await createSeasonCalendarEvent(input, organizer.discordId);
    return Response.json({ event }, { status: 201 });
  } catch (error) {
    return calendarErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const organizer = await requireAdmin();
    const body = (await request.json()) as Record<string, unknown>;
    const id = parseEventId(body.id);
    if (!id) {
      return Response.json({ error: "Не указано событие" }, { status: 400 });
    }
    const input = parseSeasonCalendarEventInput(body);
    const event = await updateSeasonCalendarEvent(
      id,
      input,
      organizer.discordId,
    );
    if (!event) {
      return Response.json({ error: "Событие не найдено" }, { status: 404 });
    }
    return Response.json({ event });
  } catch (error) {
    return calendarErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as Record<string, unknown>;
    const id = parseEventId(body.id);
    if (!id) {
      return Response.json({ error: "Не указано событие" }, { status: 400 });
    }
    if (!(await deleteSeasonCalendarEvent(id))) {
      return Response.json({ error: "Событие не найдено" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return calendarErrorResponse(error);
  }
}
