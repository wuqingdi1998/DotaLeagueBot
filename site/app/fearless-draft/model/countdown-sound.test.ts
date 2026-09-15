import { describe, expect, it } from "vitest";
import { draftCountdownCueSecond } from "./countdown-sound";
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
  it("counts the final reserve seconds while reserve time is running", () => {
    expect(draftCountdownCueSecond(timerSnapshot({
      baseRemainingSeconds: 0,
      reserveRemainingSeconds: 9.4,
      isUsingReserve: true,
    }))).toBe(10);
  });

  it("counts the final base seconds when reserve time is depleted", () => {
    expect(draftCountdownCueSecond(timerSnapshot({
      baseRemainingSeconds: 7.2,
      reserveRemainingSeconds: 0,
    }))).toBe(8);
  });

  it("stays silent during base time while reserve remains available", () => {
    expect(draftCountdownCueSecond(timerSnapshot({
      baseRemainingSeconds: 7.2,
      reserveRemainingSeconds: 30,
    }))).toBeNull();
  });

  it("stays silent outside the final ten seconds and after expiry", () => {
    expect(draftCountdownCueSecond(timerSnapshot({
      baseRemainingSeconds: 0,
      reserveRemainingSeconds: 10.2,
      isUsingReserve: true,
    }))).toBeNull();
    expect(draftCountdownCueSecond(timerSnapshot({
      baseRemainingSeconds: 0,
      reserveRemainingSeconds: 0,
      isExpired: true,
    }))).toBeNull();
  });
});
