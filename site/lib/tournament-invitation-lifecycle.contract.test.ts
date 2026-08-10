import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const tournamentRoute = source("../app/api/tournament/route.ts");
const applicationStatus = source(
  "../app/api/applications/application-status.ts",
);
const applicationUpdate = source(
  "../app/api/applications/application-update.ts",
);
const invitationCancellation = source(
  "../app/api/applications/application-invitation-cancellation.ts",
);
const applicationsAdmin = source(
  "../app/tournaments/[slug]/admin/ApplicationsAdmin.tsx",
);

describe("tournament invitation lifecycle", () => {
  it("marks accepted players in every application that uses confirmations", () => {
    expect(tournamentRoute).toContain("uses_player_confirmation");
    expect(applicationsAdmin).toContain("uses_player_confirmation");
    expect(applicationsAdmin).toContain(
      'player.invitationStatus === "accepted"',
    );
    expect(applicationsAdmin).toContain("Участие подтверждено");
  });

  it("locks the application and rejects answers after organizer rejection", () => {
    expect(applicationUpdate).toMatch(
      /FROM tournament_team_applications[\s\S]*FOR UPDATE/,
    );
    expect(applicationUpdate).toContain("INVITATION_CLOSED");
    expect(applicationUpdate).toContain('status !== "awaiting_members"');
  });

  it("cancels outstanding members and Discord invitations on rejection", () => {
    expect(applicationStatus).toContain("cancelApplicationInvitations");
    expect(applicationUpdate).toContain("cancelApplicationInvitations");
    expect(invitationCancellation).toContain("invitation_status = 'declined'");
    expect(invitationCancellation).toContain("delete_pending");
    expect(invitationCancellation).toContain("cancelled");
    expect(invitationCancellation).toContain("event_type = 'team_invitation'");
  });
});
