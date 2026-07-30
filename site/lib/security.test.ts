import { describe, expect, it } from "vitest";
import {
  playerServerName,
  secretHashMatches,
  secretMatches,
} from "./security";

describe("organizer security", () => {
  it("compares organizer secrets without direct string comparison", () => {
    expect(secretMatches("correct horse", "correct horse")).toBe(true);
    expect(secretMatches("correct horse", "wrong horse")).toBe(false);
  });

  it("compares a supplied secret with a stored sha256 hash", () => {
    const expectedHash =
      "2daab90d3cabb8eb23e03654b382dce4f621f4ce" +
      "ea26fdb620a74fe240aef4aa";
    expect(secretHashMatches("temporary secret", expectedHash)).toBe(true);
    expect(secretHashMatches("wrong secret", expectedHash)).toBe(false);
    expect(secretHashMatches("temporary secret", "invalid")).toBe(false);
  });
});

describe("player profile names", () => {
  it("uses the same name format as the Discord server", () => {
    expect(playerServerName("Ваня", "frokeng", "3/4")).toBe(
      "Ваня (frokeng) 3/4",
    );
  });

  it("falls back to the game nickname when a real name is absent", () => {
    expect(playerServerName(null, "frokeng", null)).toBe("frokeng");
  });
});
