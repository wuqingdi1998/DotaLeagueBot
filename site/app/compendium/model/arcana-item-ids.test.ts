import { describe, expect, it } from "vitest";
import { isArcanaItemId } from "./arcana-item-ids";

describe("Arcana item catalog", () => {
  it("contains Shadow Fiend and Spectre Arcana item definitions", () => {
    expect(isArcanaItemId(6996)).toBe(true);
    expect(isArcanaItemId(9662)).toBe(true);
    expect(isArcanaItemId(1)).toBe(false);
  });
});
