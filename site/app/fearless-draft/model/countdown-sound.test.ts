import { describe, expect, it } from "vitest";
import {
  draftCountdownCueId,
  isDraftCountdownWarning,
} from "./countdown-sound";
import type { DraftTimerSnapshot } from "./timer";

function timerSnapshot(
  overrides: Partial<DraftTimerSnapshot>,
): DraftTimerSnapshot {
  return {
    baseRemainingSeconds: 20,
    reserveRemainingSeconds: 130,
    isUsingReserve: false,
    isExpired: false,
    ...overrides,
  };
}

describe("Fearless Draft countdown sound", () => {
  it("warns at ten reserve seconds", () => {
    expect(isDraftCountdownWarning(timerSnapshot({
      baseRemainingSeconds: 0,
      reserveRemainingSeconds: 10,
      isUsingReserve: true,
    }))).toBe(true);
  });

  it("warns when base and reserve time total ten seconds", () => {
    expect(isDraftCountdownWarning(timerSnapshot({
      baseRemainingSeconds: 6,
      reserveRemainingSeconds: 4,
    }))).toBe(true);
  });

  it("warns at ten base seconds when reserve time is depleted", () => {
    expect(isDraftCountdownWarning(timerSnapshot({
      baseRemainingSeconds: 10,
      reserveRemainingSeconds: 0,
    }))).toBe(true);
  });

  it("stays silent before the final ten seconds and after expiry", () => {
    expect(isDraftCountdownWarning(timerSnapshot({
      baseRemainingSeconds: 6.1,
      reserveRemainingSeconds: 4,
    }))).toBe(false);
    expect(isDraftCountdownWarning(timerSnapshot({
      baseRemainingSeconds: 0,
      reserveRemainingSeconds: 0,
      isExpired: true,
    }))).toBe(false);
  });

  it("uses one sound cue for the entire warning window of a turn", () => {
    const warningAtTen = isDraftCountdownWarning(timerSnapshot({
      baseRemainingSeconds: 6,
      reserveRemainingSeconds: 4,
    }));
    const warningAtNine = isDraftCountdownWarning(timerSnapshot({
      baseRemainingSeconds: 5,
      reserveRemainingSeconds: 4,
    }));

    expect(draftCountdownCueId(12, 5, warningAtTen)).toBe("12:5");
    expect(draftCountdownCueId(12, 5, warningAtNine)).toBe("12:5");
    expect(draftCountdownCueId(12, 5, false)).toBeNull();
  });
});
