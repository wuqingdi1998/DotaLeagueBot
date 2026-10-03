import { describe, expect, it } from "vitest";
import { summarizeOctoberLaunchPlayers, type OctoberLaunchReportPlayer } from "./launch-report";

function player(
  discordId: string,
  clanId: "morbus" | "panacea",
  source: "reservation" | "automatic",
  activityScore: number,
  openDotaStatus: "available" | "unavailable" = "available",
): OctoberLaunchReportPlayer {
  return {
    discordId,
    dotaId: discordId,
    playerName: discordId,
    clanId,
    source,
    activityScore,
    decisionOrder: 1,
    reason: "Причина",
    previousCompendiumStars: 10,
    matchesLastThreeMonths: 20,
    rankedMatchesLastThreeMonths: 15,
    lastMatchAt: null,
    internalRating: 3000,
    rankTier: 40,
    openDotaStatus,
  };
}

describe("October launch report", () => {
  it("summarizes both clans and flags unavailable OpenDota data", () => {
    const summary = summarizeOctoberLaunchPlayers([
      player("1", "morbus", "reservation", 10.125),
      player("2", "panacea", "automatic", 9.5, "unavailable"),
    ]);
    expect(summary.clans.morbus).toMatchObject({
      playerCount: 1,
      reservedCount: 1,
      totalActivityScore: 10.125,
    });
    expect(summary.clans.panacea).toMatchObject({
      playerCount: 1,
      automaticCount: 1,
      totalActivityScore: 9.5,
    });
    expect(summary.unavailableActivityCount).toBe(1);
  });
});
