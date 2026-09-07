import { describe, expect, it } from "vitest";
import { draftUpdateIntervalMs } from "./update-interval";

describe("Fearless Draft live update interval", () => {
  it("checks every 250 ms outside the final reserve window", () => {
    expect(draftUpdateIntervalMs({
      stepStartedAt: "2026-09-07T12:00:00.000Z",
      baseDurationSeconds: 15,
      reserveSeconds: 130,
      serverNow: "2026-09-07T12:00:30.000Z",
    })).toBe(250);
  });

  it("checks every 100 ms during the final five reserve seconds", () => {
    expect(draftUpdateIntervalMs({
      stepStartedAt: "2026-09-07T12:00:00.000Z",
      baseDurationSeconds: 15,
      reserveSeconds: 130,
      serverNow: "2026-09-07T12:02:20.000Z",
    })).toBe(100);
  });

  it("does not use the fast interval during ordinary turn time", () => {
    expect(draftUpdateIntervalMs({
      stepStartedAt: "2026-09-07T12:00:00.000Z",
      baseDurationSeconds: 15,
      reserveSeconds: 0,
      serverNow: "2026-09-07T12:00:10.000Z",
    })).toBe(250);
  });
});
