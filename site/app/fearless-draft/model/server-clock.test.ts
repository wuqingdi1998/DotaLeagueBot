import { describe, expect, it } from "vitest";
import { serverNowAfterElapsed } from "./server-clock";

describe("Fearless Draft synchronized server clock", () => {
  it("advances from server time using only elapsed monotonic time", () => {
    const synchronizedNowMs = serverNowAfterElapsed(
      "2026-08-11T12:00:00.000Z",
      10_000,
    );

    expect(synchronizedNowMs).toBe(Date.parse("2026-08-11T12:00:10.000Z"));
  });

  it("does not move backwards when an elapsed reading is negative", () => {
    expect(serverNowAfterElapsed("2026-08-11T12:00:00.000Z", -1)).toBe(
      Date.parse("2026-08-11T12:00:00.000Z"),
    );
  });
});
