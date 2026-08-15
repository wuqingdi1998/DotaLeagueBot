import { describe, expect, it } from "vitest";
import { tournamentCheckInWindow } from "./tournament-check-in";

describe("tournament team check-in window", () => {
  const firstMatchAt = "2026-08-15T17:00:00.000Z";

  it("opens from the configured hour before the first match", () => {
    const window = tournamentCheckInWindow({
      firstMatchAt,
      checkInMinutes: 60,
      now: new Date("2026-08-15T16:00:00.000Z"),
    });

    expect(window?.opensAt).toBe("2026-08-15T16:00:00.000Z");
    expect(window?.isOpen).toBe(true);
  });

  it("closes confirmation when the first match starts", () => {
    const window = tournamentCheckInWindow({
      firstMatchAt,
      checkInMinutes: 60,
      now: new Date(firstMatchAt),
    });

    expect(window?.isOpen).toBe(false);
  });

  it("hides team check-in marks ten minutes after the start", () => {
    const beforeExpiry = tournamentCheckInWindow({
      firstMatchAt,
      checkInMinutes: 60,
      now: new Date("2026-08-15T17:09:59.000Z"),
    });
    const atExpiry = tournamentCheckInWindow({
      firstMatchAt,
      checkInMinutes: 60,
      now: new Date("2026-08-15T17:10:00.000Z"),
    });

    expect(beforeExpiry?.shouldShowStatus).toBe(true);
    expect(atExpiry?.shouldShowStatus).toBe(false);
  });
});
