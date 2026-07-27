import { describe, expect, it } from "vitest";
import {
  cleanDiscordRedirect,
  getTeamNameError,
  isSafeUploadKey,
  rolesAreComplete,
} from "./validation";

describe("team name validation", () => {
  it("accepts Russian and English names", () => {
    expect(getTeamNameError("Синие коты")).toBe("");
    expect(getTeamNameError("Team-Spirit")).toBe("");
  });

  it("limits a name to 20 characters", () => {
    expect(getTeamNameError("A".repeat(21))).toContain("20");
  });

  it("requires letters", () => {
    expect(getTeamNameError("--")).toContain("буква");
  });

  it("rejects digits", () => {
    expect(getTeamNameError("Team1")).toContain("буквы");
  });

  it("allows no more than two special characters including spaces", () => {
    expect(getTeamNameError("One Two Three Four")).toContain("двух");
    expect(getTeamNameError("One-Two")).toBe("");
  });
});

describe("team roles", () => {
  const roles = [
    "safe_lane",
    "mid_lane",
    "off_lane",
    "soft_support",
    "hard_support",
  ];

  it("accepts one player for each role", () => {
    expect(rolesAreComplete(roles)).toBe(true);
  });

  it("rejects duplicated roles", () => {
    expect(rolesAreComplete([...roles.slice(0, 4), "safe_lane"])).toBe(false);
  });

  it("rejects unknown roles", () => {
    expect(rolesAreComplete([...roles.slice(0, 4), "coach"])).toBe(false);
  });
});

describe("security helpers", () => {
  it("accepts generated upload keys only", () => {
    expect(isSafeUploadKey("6ba7b810-9dad-11d1-80b4-00c04fd430c8.png")).toBe(true);
    expect(isSafeUploadKey("../secret.png")).toBe(false);
    expect(isSafeUploadKey("logo.svg")).toBe(false);
  });

  it("keeps OAuth redirects inside the site", () => {
    expect(cleanDiscordRedirect("/setup")).toBe("/setup");
    expect(cleanDiscordRedirect("/tournaments/cup?manage=1")).toBe(
      "/tournaments/cup?manage=1",
    );
    expect(cleanDiscordRedirect("//evil.example")).toBe("/");
    expect(cleanDiscordRedirect("/\\evil.example")).toBe("/");
    expect(cleanDiscordRedirect("/\r\nLocation: https://evil.example")).toBe("/");
    expect(cleanDiscordRedirect("https://evil.example")).toBe("/");
  });
});
