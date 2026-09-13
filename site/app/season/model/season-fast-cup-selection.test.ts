import { describe, expect, it } from "vitest";
import {
  fastCupOverviews,
  selectFeaturedFastCup,
} from "./season-overview-model";

describe("featured Fastcup selection", () => {
  it("formats every visible period from the selection dates", () => {
    expect(fastCupOverviews.map((cup) => cup.period)).toEqual([
      "12–13 сентября 2026",
      "26–27 сентября 2026",
      "10–11 октября 2026",
      "24–25 октября 2026",
      "5–6 декабря 2026",
    ]);
  });

  it("selects a tournament that is currently running", () => {
    expect(
      selectFeaturedFastCup("2026-09-13", fastCupOverviews)?.linkId,
    ).toBe("cd-fastcup-7");
  });

  it("selects the nearest future tournament between events", () => {
    expect(
      selectFeaturedFastCup("2026-09-14", fastCupOverviews)?.linkId,
    ).toBe("sd-fastcup-2");
    expect(
      selectFeaturedFastCup("2026-09-28", fastCupOverviews)?.linkId,
    ).toBe("fastcup-14");
  });

  it("falls back to the latest tournament after the season", () => {
    expect(
      selectFeaturedFastCup("2026-12-31", fastCupOverviews)?.linkId,
    ).toBe("fastcup-15");
  });
});
