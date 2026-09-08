import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const organizerAccess = source("../app/tournaments/OrganizerAccess.tsx");
const tournamentDialogs = source("../app/styles/07-tournament-dialogs.css");

describe("organizer password visibility", () => {
  it("lets the organizer reveal and hide the entered password", () => {
    expect(organizerAccess).toContain("isPasswordVisible");
    expect(organizerAccess).toContain(
      'type={isPasswordVisible ? "text" : "password"}',
    );
    expect(organizerAccess).toContain('isPasswordVisible ? "Скрыть пароль"');
    expect(organizerAccess).toContain('type="button"');
    expect(organizerAccess).toContain("aria-pressed={isPasswordVisible}");
  });

  it("keeps the visibility control inside the password field", () => {
    expect(organizerAccess).toContain('className="organizer-password-field"');
    expect(organizerAccess).toContain(
      'className="organizer-password-visibility"',
    );
    expect(tournamentDialogs).toContain(".organizer-password-visibility");
    expect(tournamentDialogs).toContain("padding-right: 54px");
  });
});
