import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("organizer tools are loaded only for organizers", () => {
  it.each([
    [
      "../app/tournaments/TournamentsHub.tsx",
      "TournamentForm",
      "data.user?.isAdmin",
    ],
    [
      "../app/tournaments/[slug]/TournamentPageView.tsx",
      "TournamentAdminPanel",
      "data.user?.isAdmin",
    ],
    [
      "../app/calendar/sections/SeasonCalendarPage.tsx",
      "CalendarEventEditor",
      "isOrganizer",
    ],
    [
      "../app/participants/ParticipantsTable.tsx",
      "ParticipantAdminDialog",
      "isOrganizer && editedPlayer",
    ],
  ])("keeps %s out of the ordinary visitor bundle", (path, tool, guard) => {
    const component = source(path);
    expect(component).toContain("dynamic(");
    expect(component).toContain(`module.${tool}`);
    expect(component).toContain(guard);
    expect(component).not.toContain(`import { ${tool} }`);
  });
});
