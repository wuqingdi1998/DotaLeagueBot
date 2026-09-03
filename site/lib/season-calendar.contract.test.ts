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
const calendarSection = readFileSync(
  new URL("../app/calendar/sections/SeasonCalendarPage.tsx", import.meta.url),
  "utf8",
);
const grid = readFileSync(
  new URL("../app/calendar/components/CalendarGrid.tsx", import.meta.url),
  "utf8",
);
const periodOutline = readFileSync(
  new URL(
    "../app/calendar/components/CalendarPeriodOutline.tsx",
    import.meta.url,
  ),
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
const headerStyles = readFileSync(
  new URL("../app/styles/02-site-header.css", import.meta.url),
  "utf8",
);
const tournamentDirectoryStyles = readFileSync(
  new URL("../app/styles/10-community-home.css", import.meta.url),
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
    expect(calendarStyles).not.toMatch(
      /\.calendar-day:hover,\s*\.calendar-day:focus-within\s*\{[^}]*z-index:/,
    );
    expect(calendarStyles).toMatch(
      /\.calendar-day:hover \.calendar-event-fills,\s*\.calendar-day:focus-within \.calendar-event-fills\s*\{[^}]*z-index:\s*70;/,
    );
    expect(calendarStyles).not.toContain("calendar-event-dot");
  });

  it("shows the league cup as a hoverable period outline", () => {
    expect(grid).toContain("buildCalendarPeriodSegments(month)");
    expect(periodOutline).toContain('className="calendar-period-outline"');
    expect(periodOutline).toContain("data-tooltip={period.title}");
    expect(periodOutline).toContain("aria-label={period.title}");
    expect(periodOutline).toContain('edge !== "top" || period.hasTopEdge');
    expect(periodOutline).toContain(
      'edge !== "bottom" || period.hasBottomEdge',
    );
    expect(calendarStyles).toMatch(
      /\.calendar-period-outline\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*50;[^}]*pointer-events:\s*none;/,
    );
    expect(calendarStyles).toMatch(
      /\.calendar-period-edge\s*\{[^}]*background:\s*transparent;[^}]*pointer-events:\s*auto;/,
    );
    expect(calendarStyles).toMatch(
      /\.calendar-period-edge\.is-top::before,[\s\S]*background:\s*linear-gradient\([\s\S]*var\(--calendar-period-color\),[\s\S]*var\(--calendar-period-accent-color\)/,
    );
    expect(calendarStyles).toContain(
      ".calendar-period-outline:has(.calendar-period-edge:hover)::after",
    );
  });

  it("keeps calendar callouts balanced and the hero compact in both themes", () => {
    expect(calendarSection).toContain("Linken&apos;s Sphere Esports");
    expect(calendarSection).not.toContain("Linken&apos;s Sphere League");
    expect(calendarStyles).toMatch(
      /\.calendar-event-fill::after\s*\{[^}]*background:\s*var\(--text\);[^}]*color:\s*var\(--surface\);[^}]*text-align:\s*center;[^}]*text-wrap:\s*balance;/,
    );
    expect(calendarStyles).toMatch(
      /\.calendar-event-fill::after\s*\{[^}]*width:\s*max-content;[^}]*max-width:\s*190px;[^}]*padding:\s*7px 8px;/,
    );
    expect(calendarStyles).toMatch(
      /\.calendar-hero\s*\{[^}]*min-height:\s*0;[^}]*padding:\s*36px/,
    );
    expect(tournamentDirectoryStyles).toMatch(
      /\.directory-hero\s*\{[^}]*padding:\s*36px/,
    );
    expect(calendarStyles).toMatch(
      /\.calendar-hero p\s*\{[^}]*font-size:\s*15px;/,
    );
    expect(calendarStyles).toMatch(
      /@media \(max-width:\s*1050px\)[\s\S]*\.calendar-hero\s*\{[^}]*padding:\s*36px/,
    );
    expect(calendarStyles).toMatch(
      /@media \(max-width:\s*800px\)[\s\S]*\.calendar-hero\s*\{[^}]*padding-top:\s*38px;/,
    );
    expect(calendarStyles).toMatch(
      /@media \(max-width:\s*560px\)[\s\S]*\.calendar-hero\s*\{[^}]*padding:\s*38px 18px 24px;/,
    );
    expect(headerStyles).toMatch(
      /\.site-header \.brand img\s*\{[^}]*box-shadow:\s*none;/,
    );
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
