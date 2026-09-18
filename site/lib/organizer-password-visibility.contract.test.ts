import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const passwordField = source(
  "../app/components/OrganizerPasswordField.tsx",
);
const passwordStyles = source(
  "../app/styles/07-organizer-password.css",
);
const passwordForms = [
  source("../app/tournaments/OrganizerAccess.tsx"),
  source("../app/participants/ParticipantAdminDialog.tsx"),
  source("../app/tournaments/[slug]/admin/SeasonRegistrationAdmin.tsx"),
  source("../app/tournaments/[slug]/admin/TournamentDeletePanel.tsx"),
];

describe("organizer password visibility", () => {
  it("shows the password by default and lets the organizer hide it", () => {
    expect(passwordField).toContain("useState(true)");
    expect(passwordField).toContain(
      'type={isPasswordVisible ? "text" : "password"}',
    );
    expect(passwordField).toContain('isPasswordVisible ? "Скрыть пароль"');
    expect(passwordField).toContain('type="button"');
    expect(passwordField).toContain("aria-pressed={isPasswordVisible}");
  });

  it("uses the same visibility control in every organizer password form", () => {
    for (const form of passwordForms) {
      expect(form).toContain("<OrganizerPasswordField");
      expect(form).not.toContain('type="password"');
    }
  });

  it("keeps the visibility control inside the password field", () => {
    expect(passwordField).toContain('className="organizer-password-field"');
    expect(passwordField).toContain(
      'className="organizer-password-visibility"',
    );
    expect(passwordStyles).toContain(".organizer-password-visibility");
    expect(passwordStyles).toContain("padding-right: 54px");
  });
});
