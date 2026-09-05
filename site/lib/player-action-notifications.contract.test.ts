import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const service = source(
  "../app/api/player-actions/player-action-service.ts",
);
const header = source("../app/components/SiteHeader.tsx");
const checkInCard = source(
  "../app/tournaments/[slug]/sections/TournamentCheckInCard.tsx",
);
const seasonCheckIn = source(
  "../app/tournaments/[slug]/sections/SeasonRoundCheckIn.tsx",
);
const invitations = source(
  "../app/tournaments/[slug]/sections/TournamentNavigation.tsx",
);

describe("player action notification integration", () => {
  it("shows one header badge backed by live player actions", () => {
    expect(header).toContain("PlayerActionNotificationBadge");
    expect(service).toContain("tournamentCheckInWindow");
    expect(service).toContain("seasonRoundCheckInIsOpen");
    expect(service).toContain("member.invitation_status = 'invited'");
  });

  it("removes completed actions from the notification response", () => {
    expect(service.match(/NOT EXISTS/g)).toHaveLength(2);
    expect(service).toContain("tournament_team_checkins checkin");
    expect(service).toContain("season_round_checkins checkin");
    expect(service).toContain("application.status = 'awaiting_members'");
  });

  it("links notifications directly to their action buttons", () => {
    expect(checkInCard).toContain("team-check-in-${captainTeam.id}");
    expect(seasonCheckIn).toContain("season-check-in-${round.id}");
    expect(invitations).toContain(
      "team-invitation-${invitation.application_id}",
    );
  });
});
