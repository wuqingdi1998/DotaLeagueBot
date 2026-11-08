import { describe, expect, it } from "vitest";
import {
  normalizeTournamentDateFields,
  normalizeOptionalTournamentTiming,
  registrationStartDateError,
  missingRequiredTournamentFields,
} from "./tournament-validation";

describe("tournament registration start validation", () => {
  it.each([null, "", undefined])("accepts and stores empty optional timing (%s)", (value) => {
    const body: Record<string, unknown> = { registration_deadline: value, check_in_minutes: value };
    expect(normalizeTournamentDateFields(body)).toBe("");
    expect(normalizeOptionalTournamentTiming(body)).toBe("");
    expect(body.registration_deadline).toBeNull();
    expect(body.check_in_minutes).toBeNull();
    expect(missingRequiredTournamentFields(body)).not.toContain("registration_deadline");
    expect(missingRequiredTournamentFields(body)).not.toContain("check_in_minutes");
  });

  it("rejects invalid timing instead of silently turning it off", () => {
    expect(normalizeOptionalTournamentTiming({ check_in_minutes: -1 })).not.toBe("");
    expect(normalizeOptionalTournamentTiming({ check_in_minutes: "abc" })).not.toBe("");
    expect(normalizeOptionalTournamentTiming({ check_in_minutes: false })).not.toBe("");
    expect(normalizeTournamentDateFields({ registration_deadline: "wrong" })).not.toBe("");
    expect(normalizeOptionalTournamentTiming({ show_start_in_overview: "false" })).not.toBe("");
  });
  it("stores an omitted registration start as null", () => {
    const body: Record<string, unknown> = {
      registration_starts_at: "",
    };

    expect(normalizeTournamentDateFields(body)).toBe("");
    expect(body.registration_starts_at).toBeNull();
  });

  it("accepts a registration start before its deadline", () => {
    expect(
      registrationStartDateError({
        registration_starts_at: "2026-10-05T09:00:00.000Z",
        registration_deadline: "2026-10-06T09:00:00.000Z",
      }),
    ).toBe("");
  });

  it("rejects a registration start at or after its deadline", () => {
    expect(
      registrationStartDateError({
        registration_starts_at: "2026-10-06T09:00:00.000Z",
        registration_deadline: "2026-10-06T09:00:00.000Z",
      }),
    ).toBe("Старт регистрации должен быть раньше её дедлайна");
  });
});
