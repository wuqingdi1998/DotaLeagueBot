import { describe, expect, it } from "vitest";
import {
  formatMoscowYear,
  moscowDateKey,
  moscowDateTimeInputToIso,
  toMoscowDateTimeInput,
} from "./moscow-date-time";

describe("Moscow date-time fields", () => {
  it("shows stored UTC instants as Moscow wall time", () => {
    expect(toMoscowDateTimeInput("2026-08-25T19:00:00.000Z")).toBe(
      "2026-08-25T22:00",
    );
  });

  it("stores date-time field values as Moscow time", () => {
    expect(moscowDateTimeInputToIso("2026-08-25T22:00")).toBe(
      "2026-08-25T19:00:00.000Z",
    );
  });

  it("keeps explicitly zoned values unchanged", () => {
    expect(moscowDateTimeInputToIso("2026-08-25T19:00:00.000Z")).toBe(
      "2026-08-25T19:00:00.000Z",
    );
  });

  it("uses the Moscow year at the UTC year boundary", () => {
    expect(formatMoscowYear("2025-12-31T22:00:00.000Z")).toBe("2026");
  });

  it("switches the calendar date at Moscow midnight", () => {
    expect(moscowDateKey(new Date("2026-09-10T20:59:59.999Z"))).toBe(
      "2026-09-10",
    );
    expect(moscowDateKey(new Date("2026-09-10T21:00:00.000Z"))).toBe(
      "2026-09-11",
    );
  });
});
