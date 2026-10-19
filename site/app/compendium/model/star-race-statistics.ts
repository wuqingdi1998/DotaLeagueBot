import { scanRankedWins } from "./matches";
import type { StarRaceQuestRequirement } from "./star-race";
import type { OpenDotaMatch } from "./types";
import { RANKED_LOBBY_TYPES } from "./constants";

export function hasPendingStarRaceStatistics(input: {
  requirement: StarRaceQuestRequirement;
  matches: OpenDotaMatch[];
  dayStart: Date;
  dayEnd: Date;
  now: Date;
}): boolean {
  const requirement = input.requirement;
  if (requirement.kind === "match-stat-win" || requirement.kind === "cumulative-assists" || requirement.kind === "cumulative-net-worth") {
    const stats = requirement.kind === "cumulative-assists" ? ["assists" as const]
      : requirement.kind === "cumulative-net-worth" ? ["net_worth" as const] : requirement.conditions.map(({ stat }) => stat);
    const winningIds = new Set(scanRankedWins(input).map((win) => win.matchId));
    return input.matches.some((match) => winningIds.has(String(match.match_id)) &&
      (!("isRankedOnly" in requirement) || !requirement.isRankedOnly || RANKED_LOBBY_TYPES.has(match.lobby_type)) &&
      stats.some((stat) => match[stat] == null));
  }
  const stat = requirement.kind === "winning-building-damage" ? "tower_damage"
    : requirement.kind === "ranked-win-stat" || requirement.kind === "cumulative-ranked-win-stat"
      ? requirement.stat : null;
  if (!stat) return false;
  const heroes = requirement.kind === "ranked-win-stat" || requirement.kind === "cumulative-ranked-win-stat"
    ? requirement.heroIds : null;
  const winningIds = new Set(scanRankedWins(input).map((win) => win.matchId));
  return input.matches.some((match) => winningIds.has(String(match.match_id)) &&
    (!heroes || heroes.includes(match.hero_id)) && match[stat] == null);
}
