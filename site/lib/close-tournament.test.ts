import { describe, expect, it } from "vitest";
import {
  isCloseGameFormat,
  usesFearlessDraft,
  validCloseBestOf,
} from "./close-tournament";

describe("close tournament formats", () => {
  it.each(["Fearless Draft", "CM", "CD", "SD"])(
    "accepts %s",
    (format) => expect(isCloseGameFormat(format)).toBe(true),
  );

  it("requires at least two maps for Fearless Draft", () => {
    expect(validCloseBestOf("Fearless Draft", 1)).toBe(false);
    expect(validCloseBestOf("Fearless Draft", 2)).toBe(true);
    expect(usesFearlessDraft("Fearless Draft")).toBe(true);
  });

  it("allows BO1 for standard Dota formats", () => {
    expect(validCloseBestOf("CM", 1)).toBe(true);
  });
});
