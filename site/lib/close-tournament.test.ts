import { describe, expect, it } from "vitest";
import {
  isDirectCloseGameFormat,
  isCloseGameFormat,
  usesFearlessDraft,
  validCloseBestOf,
} from "./close-tournament";

describe("close tournament formats", () => {
  it.each([
    "Fearless Draft",
    "Captain's Mode",
    "Captain's Draft",
    "Single Draft",
    "Другой режим",
  ])(
    "accepts %s",
    (format) => expect(isCloseGameFormat(format)).toBe(true),
  );

  it("requires at least two maps for Fearless Draft", () => {
    expect(validCloseBestOf("Fearless Draft", 1)).toBe(false);
    expect(validCloseBestOf("Fearless Draft", 2)).toBe(true);
    expect(usesFearlessDraft("Fearless Draft")).toBe(true);
  });

  it("allows BO1 for standard Dota formats", () => {
    expect(validCloseBestOf("Captain's Mode", 1)).toBe(true);
    expect(validCloseBestOf("Другой режим", 1)).toBe(true);
    expect(isDirectCloseGameFormat("Captain's Draft")).toBe(true);
    expect(isDirectCloseGameFormat("Другой режим")).toBe(true);
  });
});
