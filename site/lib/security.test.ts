import { describe, expect, it } from "vitest";
import { playerServerName, secretMatches } from "./security";

describe("organizer security", () => {
  it("compares organizer secrets without direct string comparison", () => {
    expect(secretMatches("correct horse", "correct horse")).toBe(true);
    expect(secretMatches("correct horse", "wrong horse")).toBe(false);
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
