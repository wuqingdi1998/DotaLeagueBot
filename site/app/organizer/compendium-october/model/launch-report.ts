import type { OctoberClanId } from "./clans";

export type OctoberFormationStatus =
  | "pending"
  | "preparing"
  | "review"
  | "approved"
  | "cancelled"
  | "publishing"
  | "complete"
  | "failed";

export type OctoberLaunchReportPlayer = {
  discordId: string;
  dotaId: string;
  playerName: string;
  clanId: OctoberClanId;
  source: "reservation" | "automatic";
  activityScore: number;
  decisionOrder: number;
  reason: string;
  matchesLastThreeMonths: number;
  rankedMatchesLastThreeMonths: number;
  lastMatchAt: string | null;
  internalRating: number;
  rankTier: number;
  openDotaStatus: "available" | "unavailable";
};

export type OctoberLaunchClanSummary = {
  playerCount: number;
  reservedCount: number;
  automaticCount: number;
  totalActivityScore: number;
  matchesLastThreeMonths: number;
  rankedMatchesLastThreeMonths: number;
};

export type OctoberLaunchReport = {
  status: OctoberFormationStatus;
  preparedAt: string | null;
  decisionAt: string | null;
  decidedByName: string | null;
  errorMessage: string | null;
  unavailableActivityCount: number;
  clans: Record<OctoberClanId, OctoberLaunchClanSummary>;
  players: OctoberLaunchReportPlayer[];
};

function emptyClanSummary(): OctoberLaunchClanSummary {
  return {
    playerCount: 0,
    reservedCount: 0,
    automaticCount: 0,
    totalActivityScore: 0,
    matchesLastThreeMonths: 0,
    rankedMatchesLastThreeMonths: 0,
  };
}

export function summarizeOctoberLaunchPlayers(
  players: readonly OctoberLaunchReportPlayer[],
): Pick<OctoberLaunchReport, "clans" | "unavailableActivityCount"> {
  const clans: OctoberLaunchReport["clans"] = {
    morbus: emptyClanSummary(),
    panacea: emptyClanSummary(),
  };
  let unavailableActivityCount = 0;
  for (const player of players) {
    const clan = clans[player.clanId];
    clan.playerCount += 1;
    clan[player.source === "reservation" ? "reservedCount" : "automaticCount"] += 1;
    clan.totalActivityScore += player.activityScore;
    clan.matchesLastThreeMonths += player.matchesLastThreeMonths;
    clan.rankedMatchesLastThreeMonths += player.rankedMatchesLastThreeMonths;
    if (player.openDotaStatus === "unavailable") unavailableActivityCount += 1;
  }
  for (const clan of Object.values(clans)) {
    clan.totalActivityScore = Number(clan.totalActivityScore.toFixed(3));
  }
  return { clans, unavailableActivityCount };
}
