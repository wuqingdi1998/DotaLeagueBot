import { describe, expect, it } from "vitest";
import {
  isSeasonTournamentLinkId,
  normalizeSeasonTournamentHref,
} from "./season-overview-model";

describe("season tournament links", () => {
  it("recognizes only links shown as editable on the season page", () => {
    expect(isSeasonTournamentLinkId("cd-fastcup-7")).toBe(true);
    expect(isSeasonTournamentLinkId("league-season-9")).toBe(false);
    expect(isSeasonTournamentLinkId(7)).toBe(false);
  });

  it("accepts local tournament paths and safe web addresses", () => {
    expect(normalizeSeasonTournamentHref(" /tournaments/cd-fastcup-7 ")).toBe(
      "/tournaments/cd-fastcup-7",
    );
    expect(normalizeSeasonTournamentHref("example.com/tournament/7")).toBe(
      "https://example.com/tournament/7",
    );
    expect(normalizeSeasonTournamentHref("https://example.com/cup")).toBe(
      "https://example.com/cup",
    );
  });

  it("rejects empty, unsafe and malformed addresses", () => {
    expect(normalizeSeasonTournamentHref(" ")).toBeNull();
    expect(normalizeSeasonTournamentHref("javascript:alert(1)")).toBeNull();
    expect(normalizeSeasonTournamentHref("//example.com/cup")).toBeNull();
    expect(normalizeSeasonTournamentHref(null)).toBeNull();
  });
});
