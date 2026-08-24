import { describe, expect, it } from "vitest";
import {
  assertCompendiumActive,
  compendiumDisplayDateKey,
  isCompendiumFinished,
} from "./lifecycle";

describe("TI 2026 compendium lifecycle", () => {
  it("remains active until the final Moscow day ends", () => {
    const beforeEnd = new Date("2026-08-23T23:59:59.999+03:00");

    expect(isCompendiumFinished(beforeEnd)).toBe(false);
    expect(() => assertCompendiumActive(beforeEnd)).not.toThrow();
  });

  it("is permanently read-only from 24 August Moscow time", () => {
    const end = new Date("2026-08-24T00:00:00+03:00");

    expect(isCompendiumFinished(end)).toBe(true);
    expect(() => assertCompendiumActive(end)).toThrowError(
      expect.objectContaining({ code: "COMPENDIUM_FINISHED" }),
    );
    expect(compendiumDisplayDateKey(end)).toBe("2026-08-23");
  });
});
