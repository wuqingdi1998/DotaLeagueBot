import type { OctoberClanId } from "./clans";

export type OctoberClanCandidate = {
  discordId: string;
  reservation: OctoberClanId | null;
  previousCompendiumStars: number;
  matchesLastThreeMonths: number;
  rankedMatchesLastThreeMonths: number;
  internalRating: number;
  rankTier: number;
};

export type OctoberClanAssignment = {
  discordId: string;
  clanId: OctoberClanId;
  source: "reservation" | "automatic";
  activityScore: number;
};

const CLAN_IDS: readonly OctoberClanId[] = ["morbus", "panacea"];

export function octoberClanActivityScore(
  player: OctoberClanCandidate,
): number {
  return (
    player.previousCompendiumStars * 4 +
    player.rankedMatchesLastThreeMonths * 2 +
    player.matchesLastThreeMonths * 0.25 +
    player.internalRating / 1000 +
    player.rankTier / 10
  );
}

function clanCapacities(players: readonly OctoberClanCandidate[]) {
  const capacities: Record<OctoberClanId, number> = {
    morbus: players.filter((player) => player.reservation === "morbus").length,
    panacea: players.filter((player) => player.reservation === "panacea").length,
  };
  let unallocated = players.length - capacities.morbus - capacities.panacea;
  while (unallocated > 0) {
    const clanId = capacities.morbus <= capacities.panacea ? "morbus" : "panacea";
    capacities[clanId] += 1;
    unallocated -= 1;
  }
  return capacities;
}

export function assignOctoberClans(
  players: readonly OctoberClanCandidate[],
): OctoberClanAssignment[] {
  const capacities = clanCapacities(players);
  const counts: Record<OctoberClanId, number> = { morbus: 0, panacea: 0 };
  const scores: Record<OctoberClanId, number> = { morbus: 0, panacea: 0 };
  const assignments: OctoberClanAssignment[] = [];

  for (const player of players.filter((item) => item.reservation !== null)) {
    const clanId = player.reservation!;
    const activityScore = octoberClanActivityScore(player);
    counts[clanId] += 1;
    scores[clanId] += activityScore;
    assignments.push({
      discordId: player.discordId,
      clanId,
      source: "reservation",
      activityScore,
    });
  }

  const unreserved = players
    .filter((player) => player.reservation === null)
    .sort((left, right) =>
      octoberClanActivityScore(right) - octoberClanActivityScore(left) ||
      left.discordId.localeCompare(right.discordId),
    );

  for (const player of unreserved) {
    const available = CLAN_IDS.filter((clanId) => counts[clanId] < capacities[clanId]);
    const clanId = [...available].sort((left, right) =>
      scores[left] - scores[right] ||
      counts[left] - counts[right] ||
      left.localeCompare(right),
    )[0];
    if (!clanId) throw new Error("Не удалось найти свободное место в кланах");
    const activityScore = octoberClanActivityScore(player);
    counts[clanId] += 1;
    scores[clanId] += activityScore;
    assignments.push({
      discordId: player.discordId,
      clanId,
      source: "automatic",
      activityScore,
    });
  }

  return assignments.sort((left, right) =>
    left.discordId.localeCompare(right.discordId),
  );
}
