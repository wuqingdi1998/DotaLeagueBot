import { describe, expect, it } from "vitest";
import { parseGroupCount } from "./group-generation";

describe("group count validation", () => {
  it("accepts only whole group counts from 1 to 8", () => {
    expect(parseGroupCount(1)).toBe(1);
    expect(parseGroupCount(8)).toBe(8);
    expect(parseGroupCount(1.5)).toBeNull();
    expect(parseGroupCount(0)).toBeNull();
    expect(parseGroupCount(9)).toBeNull();
  });

  it("keeps the existing default of two groups", () => {
    expect(parseGroupCount(undefined)).toBe(2);
  });
});
