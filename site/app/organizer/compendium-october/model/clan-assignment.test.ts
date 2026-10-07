import { describe, expect, it } from "vitest";
import { assignOctoberClans, octoberClanActivityScore } from "./clan-assignment";

const player = (
  discordId: string,
  reservation: "morbus" | "panacea" | null,
  rankedMatches: number,
) => ({
  discordId,
  reservation,
  activityStatus: "available" as const,
  matchesLastThreeMonths: rankedMatches + 5,
  rankedMatchesLastThreeMonths: rankedMatches,
  internalRating: 3000,
  rankTier: 40,
});

describe("October clan assignment", () => {
  it("never moves a reserved player", () => {
    const assignments = assignOctoberClans([
      player("reserved-morbus", "morbus", 40),
      player("reserved-panacea", "panacea", 35),
      player("3", null, 30),
      player("4", null, 20),
    ]);
    expect(assignments.find((item) => item.discordId === "reserved-morbus"))
      .toMatchObject({ clanId: "morbus", source: "reservation" });
    expect(assignments.find((item) => item.discordId === "reserved-panacea"))
      .toMatchObject({ clanId: "panacea", source: "reservation" });
  });

  it("keeps clan sizes equal when reservations permit it", () => {
    const assignments = assignOctoberClans([
      player("1", "morbus", 30),
      player("2", null, 28),
      player("3", null, 26),
      player("4", null, 24),
      player("5", null, 22),
      player("6", null, 20),
    ]);
    expect(assignments.filter((item) => item.clanId === "morbus")).toHaveLength(3);
    expect(assignments.filter((item) => item.clanId === "panacea")).toHaveLength(3);
  });

  it("fills the other clan first after a one-sided reservation rush", () => {
    const assignments = assignOctoberClans([
      player("1", "morbus", 40),
      player("2", "morbus", 35),
      player("3", "morbus", 30),
      player("4", null, 25),
      player("5", null, 20),
      player("6", null, 15),
    ]);
    expect(assignments.filter((item) => item.clanId === "panacea")).toHaveLength(3);
  });

  it("counts recent ranked activity without using past compendium stars", () => {
    const inactive = player("inactive", null, 0);
    const dotaActive = player("dota", null, 30);
    expect(octoberClanActivityScore(dotaActive))
      .toBeGreaterThan(octoberClanActivityScore(inactive));
  });
});
