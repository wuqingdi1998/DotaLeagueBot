import { expect, it } from "vitest";
import { nextVerificationAttempt, VERIFICATION_RETRY_MINUTES } from "./verification-retries";

it("keeps the two hour schedule anchored across midnight and week boundaries", () => {
  const startedAt = "2026-10-11T23:58:00+03:00";
  expect(VERIFICATION_RETRY_MINUTES).toEqual([2, 4, 6, 8, 10, 20, 30, 40, 50, 60, 120]);
  expect(nextVerificationAttempt(startedAt, new Date("2026-10-12T00:00:10+03:00")))
    .toEqual({ at: "2026-10-11T21:02:00.000Z", index: 1 });
  expect(nextVerificationAttempt(startedAt, new Date("2026-10-12T01:58:00+03:00"))).toBeNull();
});
it("skips overdue intermediate slots after an outage without extending the deadline", () => {
  expect(nextVerificationAttempt("2026-10-11T23:00:00+03:00", new Date("2026-10-12T00:10:00+03:00")))
    .toEqual({ at: "2026-10-11T22:00:00.000Z", index: 10 });
});
