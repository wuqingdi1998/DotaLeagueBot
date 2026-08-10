import { describe, expect, it } from "vitest";
import {
  parseMaximumTeamTier,
  registrationTierError,
  teamTierTotal,
} from "./tournament-registration-tier";

const players = [
  { ingame_name: "One", tier: 10 },
  { ingame_name: "Two", tier: 9 },
  { ingame_name: "Three", tier: 8 },
  { ingame_name: "Four", tier: 7 },
  { ingame_name: "Five", tier: 6 },
];

describe("tournament registration tier limit", () => {
  it("accepts an empty limit or a whole configured number", () => {
    expect(parseMaximumTeamTier(null)).toBeNull();
    expect(parseMaximumTeamTier("")).toBeNull();
    expect(parseMaximumTeamTier(37)).toBe(37);
    expect(parseMaximumTeamTier(37.5)).toBeUndefined();
  });

  it("calculates the team total only when every tier is known", () => {
    expect(teamTierTotal(players)).toBe(40);
    expect(teamTierTotal([...players.slice(0, 4), { ingame_name: "Five", tier: null }])).toBeNull();
  });

  it("does not impose a limit when the setting is empty", () => {
    expect(registrationTierError(null, players)).toBeNull();
  });

  it("rejects a team above the configured total", () => {
    expect(registrationTierError(39, players)).toContain("40");
    expect(registrationTierError(39, players)).toContain("39");
    expect(registrationTierError(40, players)).toBeNull();
  });

  it("rejects an unknown tier when a limit is enabled", () => {
    expect(
      registrationTierError(40, [
        ...players.slice(0, 4),
        { ingame_name: "Five", tier: null },
      ]),
    ).toContain("Five");
  });
});
