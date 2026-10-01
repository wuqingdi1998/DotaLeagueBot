import { describe, expect, it } from "vitest";
import { assignOctoberClans, octoberClanActivityScore } from "./clan-assignment";

const player = (
  discordId: string,
  reservation: "morbus" | "panacea" | null,
  previousCompendiumStars: number,
  rankedMatches: number,
) => ({
  discordId,
  reservation,
  previousCompendiumStars,
  matchesLastThreeMonths: rankedMatches + 5,
  rankedMatchesLastThreeMonths: rankedMatches,
  internalRating: 3000,
  rankTier: 40,
});

describe("October clan assignment", () => {
  it("never moves a reserved player", () => {
    const assignments = assignOctoberClans([
      player("reserved-morbus", "morbus", 100, 40),
      player("reserved-panacea", "panacea", 80, 35),
      player("3", null, 60, 30),
      player("4", null, 40, 20),
    ]);
    expect(assignments.find((item) => item.discordId === "reserved-morbus"))
      .toMatchObject({ clanId: "morbus", source: "reservation" });
    expect(assignments.find((item) => item.discordId === "reserved-panacea"))
      .toMatchObject({ clanId: "panacea", source: "reservation" });
  });

  it("keeps clan sizes equal when reservations permit it", () => {
    const assignments = assignOctoberClans([
      player("1", "morbus", 90, 30),
      player("2", null, 80, 28),
      player("3", null, 70, 26),
      player("4", null, 60, 24),
      player("5", null, 50, 22),
      player("6", null, 40, 20),
    ]);
    expect(assignments.filter((item) => item.clanId === "morbus")).toHaveLength(3);
    expect(assignments.filter((item) => item.clanId === "panacea")).toHaveLength(3);
  });

  it("fills the other clan first after a one-sided reservation rush", () => {
    const assignments = assignOctoberClans([
      player("1", "morbus", 100, 40),
      player("2", "morbus", 90, 35),
      player("3", "morbus", 80, 30),
      player("4", null, 70, 25),
      player("5", null, 60, 20),
      player("6", null, 50, 15),
    ]);
    expect(assignments.filter((item) => item.clanId === "panacea")).toHaveLength(3);
  });

  it("counts past compendium and recent ranked activity in the score", () => {
    const inactive = player("inactive", null, 0, 0);
    const compendiumActive = player("compendium", null, 40, 0);
    const dotaActive = player("dota", null, 0, 30);
    expect(octoberClanActivityScore(compendiumActive))
      .toBeGreaterThan(octoberClanActivityScore(inactive));
    expect(octoberClanActivityScore(dotaActive))
      .toBeGreaterThan(octoberClanActivityScore(inactive));
  });
});
