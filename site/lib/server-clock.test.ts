import { describe, expect, it } from "vitest";
import { serverTimeFromAnchor } from "./server-clock";

describe("server clock", () => {
  it("advances from the server timestamp by monotonic elapsed time", () => {
    expect(
      serverTimeFromAnchor("2026-08-25T19:00:00.000Z", 1_000, 6_250),
    ).toBe(Date.parse("2026-08-25T19:00:05.250Z"));
  });

  it("does not move backwards when the monotonic clock is reset", () => {
    expect(
      serverTimeFromAnchor("2026-08-25T19:00:00.000Z", 6_250, 1_000),
    ).toBe(Date.parse("2026-08-25T19:00:00.000Z"));
  });
});
