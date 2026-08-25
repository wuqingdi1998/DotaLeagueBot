import { describe, expect, it } from "vitest";
import {
  formatComputerTimeHint,
  moscowRecurringTimeToIso,
} from "./local-time-hint";

describe("local computer time hints", () => {
  it("formats an instant in the requested computer time zone", () => {
    const hint = formatComputerTimeHint(
      "2026-08-25T19:10:00.000Z",
      "Europe/Berlin",
    );
    expect(hint).toContain("21:10 по времени на вашем ПК");
    expect(hint).toContain("25 августа 2026");
  });

  it("uses the current Moscow date for a recurring Moscow time", () => {
    expect(
      moscowRecurringTimeToIso(
        "00:00",
        new Date("2026-08-25T22:30:00.000Z"),
      ),
    ).toBe("2026-08-26T00:00+03:00");
  });

  it("rejects values that are not times", () => {
    expect(moscowRecurringTimeToIso("midnight")).toBe("");
    expect(formatComputerTimeHint("not-a-date")).toBe("");
  });
});
