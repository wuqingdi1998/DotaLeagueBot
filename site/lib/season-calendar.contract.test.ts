import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const header = readFileSync(
  new URL("../app/components/SiteHeader.tsx", import.meta.url),
  "utf8",
);
const page = readFileSync(
  new URL("../app/calendar/page.tsx", import.meta.url),
  "utf8",
);
const grid = readFileSync(
  new URL("../app/calendar/components/CalendarGrid.tsx", import.meta.url),
  "utf8",
);
const editor = readFileSync(
  new URL("../app/calendar/admin/CalendarEventEditor.tsx", import.meta.url),
  "utf8",
);
const route = readFileSync(
  new URL("../app/api/calendar-events/route.ts", import.meta.url),
  "utf8",
);

describe("season nine calendar contract", () => {
  it("adds Calendar to desktop and mobile navigation", () => {
    expect(header.match(/href="\/calendar"/g)).toHaveLength(2);
    expect(header).toContain("calendarActive");
  });

  it("shows public event dots with hover and keyboard labels", () => {
    expect(page).toContain("listSeasonCalendarEvents");
    expect(grid).toContain('className="calendar-event-dot"');
    expect(grid).toContain("data-tooltip={event.title}");
    expect(grid).toContain("aria-label={eventAccessibleLabel(event)}");
  });

  it("shows the editor only to organizers and protects all changes", () => {
    expect(page).toContain("isOrganizer={Boolean(user?.isAdmin)}");
    expect(editor).toContain("Цвет кружочка");
    expect(editor).toContain("Название ивента");
    expect(route.match(/requireAdmin\(\)/g)).toHaveLength(3);
    expect(route).toContain("createSeasonCalendarEvent");
    expect(route).toContain("updateSeasonCalendarEvent");
    expect(route).toContain("deleteSeasonCalendarEvent");
  });
});
