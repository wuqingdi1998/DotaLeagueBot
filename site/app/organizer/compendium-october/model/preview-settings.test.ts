import { describe, expect, it } from "vitest";
import {
  OCTOBER_PREVIEW_MAXIMUM_STARS,
  octoberPreviewStars,
} from "./preview-settings";

describe("October organizer preview settings", () => {
  it("shows a participant's first-day score unless the maximum preview is enabled", () => {
    expect(octoberPreviewStars(undefined)).toBe(0);
    expect(octoberPreviewStars("60")).toBe(0);
    expect(octoberPreviewStars(["100"])).toBe(0);
    expect(octoberPreviewStars(String(OCTOBER_PREVIEW_MAXIMUM_STARS))).toBe(100);
  });
});
