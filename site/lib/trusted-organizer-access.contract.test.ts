import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source(
  "../../bot/database/migrations/0149_trusted_organizers.sql",
);
const auth = source("./auth.ts");
const siteBreak = source("./site-break.ts");
const participantsPage = source("../app/participants/page.tsx");
const participantDialog = source(
  "../app/participants/ParticipantAdminDialog.tsx",
);
const seasonRegistration = source(
  "../app/tournaments/[slug]/admin/SeasonRegistrationAdmin.tsx",
);
const tournamentDelete = source(
  "../app/tournaments/[slug]/admin/TournamentDeletePanel.tsx",
);

describe("trusted organizer access", () => {
  it("stores the approved Discord organizer in one durable allowlist", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS trusted_organizers");
    expect(migration).toContain("311247030422863882");
    expect(migration).not.toContain("emojidrive");
  });

  it("grants trusted access from the ordinary Discord session", () => {
    expect(auth).toContain("trusted_organizers");
    expect(auth).toContain("organizerAccessMethod");
    expect(auth).toContain('organizerAccess: "trusted"');
    expect(siteBreak).toContain("trusted_organizers");
  });

  it("keeps server-side password confirmation for password sessions", () => {
    expect(auth).toContain("confirmSensitiveOrganizerAction");
    expect(auth).toContain("requiresFreshOrganizerPassword");
    expect(auth).toContain("verifyOrganizerPassword");
    expect(auth).toContain("confirmation.confirmed !== true");
  });

  it("shows password fields only to password-based organizers", () => {
    expect(participantsPage).toContain(
      'requiresPasswordConfirmation={user?.organizerAccess === "password"}',
    );
    expect(participantDialog).toContain("requiresPasswordConfirmation");
    expect(seasonRegistration).toContain("requiresPasswordConfirmation");
    expect(tournamentDelete).toContain("requiresPasswordConfirmation");
  });
});
