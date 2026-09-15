import { describe, expect, it } from "vitest";
import {
  tournamentRoundHref,
  tournamentSectionTabs,
  tournamentTabFromLocation,
  tournamentTabHref,
} from "../app/tournaments/[slug]/model/tournament-route";

describe("tournament tab routes", () => {
  it.each(tournamentSectionTabs)("gives the %s tab its own page", (tab) => {
    expect(tournamentTabHref("league-season-9", tab)).toBe(
      `/tournaments/league-season-9/${tab}`,
    );
    expect(
      tournamentTabFromLocation(
        `/tournaments/league-season-9/${tab}`,
        0,
      ),
    ).toBe(tab);
  });

  it("keeps round links compatible with existing announcements", () => {
    expect(tournamentRoundHref("league-season-9", 3)).toBe(
      "/tournaments/league-season-9?round=3",
    );
    expect(tournamentTabFromLocation("/tournaments/league-season-9", 3)).toBe(
      "round",
    );
  });
});
