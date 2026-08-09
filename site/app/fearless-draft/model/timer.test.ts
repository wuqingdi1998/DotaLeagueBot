import { describe, expect, it } from "vitest";
import { consumedReserveSeconds, draftTimerSnapshot } from "./timer";

describe("Fearless Draft timer", () => {
  const startedAt = new Date("2026-08-09T12:00:00Z");

  it("uses base time before reserve time", () => {
    const timer = { baseDurationSeconds: 15, reserveSeconds: 130, stepStartedAt: startedAt };
    expect(draftTimerSnapshot(timer, new Date("2026-08-09T12:00:10Z"))).toMatchObject({
      baseRemainingSeconds: 5,
      reserveRemainingSeconds: 130,
      isUsingReserve: false,
      isExpired: false,
    });
    expect(consumedReserveSeconds(timer, new Date("2026-08-09T12:00:20Z"))).toBe(5);
  });

  it("expires after base and reserve time", () => {
    expect(draftTimerSnapshot(
      { baseDurationSeconds: 15, reserveSeconds: 5, stepStartedAt: startedAt },
      new Date("2026-08-09T12:00:20Z"),
    ).isExpired).toBe(true);
  });
});
