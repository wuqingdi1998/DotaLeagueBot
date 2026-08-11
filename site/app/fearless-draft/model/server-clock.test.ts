import { describe, expect, it } from "vitest";
import {
  applyServerClockOffset,
  serverClockOffsetMs,
} from "./server-clock";

describe("Fearless Draft synchronized server clock", () => {
  it("keeps a five-minute request at 5:00 when the player clock is ahead", () => {
    const serverNow = "2026-08-11T12:00:00.000Z";
    const clientNowMs = Date.parse("2026-08-11T12:00:20.000Z");
    const expiresAtMs = Date.parse("2026-08-11T12:05:00.000Z");
    const offsetMs = serverClockOffsetMs(serverNow, clientNowMs);
    const synchronizedNowMs = applyServerClockOffset(clientNowMs, offsetMs);

    expect((expiresAtMs - synchronizedNowMs) / 1_000).toBe(300);
  });
});
