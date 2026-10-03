import { describe, expect, it } from "vitest";
import {
  normalizeTournamentDateFields,
  registrationStartDateError,
} from "./tournament-validation";

describe("tournament registration start validation", () => {
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
