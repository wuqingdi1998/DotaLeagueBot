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
const calendarStyles = readFileSync(
  new URL("../app/styles/62-season-calendar.css", import.meta.url),
  "utf8",
);

describe("season nine calendar contract", () => {
  it("adds Calendar to desktop and mobile navigation", () => {
    expect(header.match(/href="\/calendar"/g)).toHaveLength(2);
    expect(header).toContain("calendarActive");
  });

  it("fills half of event days with hover and keyboard labels", () => {
    expect(page).toContain("listSeasonCalendarEvents");
    expect(grid).toContain('className="calendar-event-fill"');
    expect(grid).toContain("data-tooltip={event.title}");
    expect(grid).toContain("aria-label={eventAccessibleLabel(event)}");
    expect(calendarStyles).toMatch(
      /\.calendar-event-fills\s*\{[^}]*position:\s*absolute;[^}]*height:\s*50%;/,
    );
    expect(calendarStyles).toMatch(
      /\.calendar-days\s*\{[^}]*border-top:\s*2px[^}]*border-left:\s*2px/,
    );
    expect(calendarStyles).toMatch(
      /\.calendar-day\s*\{[^}]*border-right:\s*2px[^}]*border-bottom:\s*2px/,
    );
    expect(calendarStyles).not.toContain("calendar-event-dot");
  });

  it("shows the editor only to organizers and protects all changes", () => {
    expect(page).toContain("isOrganizer={Boolean(user?.isAdmin)}");
    expect(editor).toContain("Цвет заливки");
    expect(editor).toContain("Название ивента");
    expect(route.match(/requireAdmin\(\)/g)).toHaveLength(3);
    expect(route).toContain("createSeasonCalendarEvent");
    expect(route).toContain("updateSeasonCalendarEvent");
    expect(route).toContain("deleteSeasonCalendarEvent");
  });
});
