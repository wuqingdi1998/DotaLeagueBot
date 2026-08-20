import { describe, expect, it } from "vitest";
import {
  ARCANA_WEARABLE_ITEMS,
  isArcanaHeroId,
  isArcanaItemId,
} from "./arcana-item-ids";

describe("Arcana item catalog", () => {
  it("contains one primary Arcana item for every Arcana hero", () => {
    expect(ARCANA_WEARABLE_ITEMS.map(({ itemId }) => itemId)).toEqual([
      4794, 5810, 5957, 6879, 6914, 6996, 7247, 7385, 7756, 9050,
      9059, 9235, 9662, 12451, 12692, 12930, 13456, 13670, 13806,
      18033, 18539, 19090, 22718, 23095,
    ]);

    expect(new Set(ARCANA_WEARABLE_ITEMS.map(({ hero }) => hero)).size).toBe(24);
    expect(new Set(ARCANA_WEARABLE_ITEMS.map(({ heroId }) => heroId)).size).toBe(24);

    for (const { itemId } of ARCANA_WEARABLE_ITEMS) {
      expect(isArcanaItemId(itemId)).toBe(true);
    }

    expect(isArcanaItemId(1)).toBe(false);
    expect(isArcanaHeroId(86)).toBe(true);
    expect(isArcanaHeroId(19)).toBe(false);
  });
});
