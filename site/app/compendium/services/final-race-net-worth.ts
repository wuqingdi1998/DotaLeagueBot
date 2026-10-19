import { OPEN_DOTA_CACHE_TTL_MS } from "../model/constants";
import { CompendiumError } from "../model/errors";
import { scanRankedWins } from "../model/matches";
import type { StarRaceQuestRequirement } from "../model/star-race";
import type { OpenDotaMatch } from "../model/types";
import { fetchOpenDotaMatchDetails } from "./opendota-match-details";

const cache = new Map<string, { expiresAt: number; value: Promise<number | null> }>();

async function playerNetWorth(dotaId: string, match: OpenDotaMatch): Promise<number | null> {
  const key = `${dotaId}:${match.match_id}:${match.player_slot}:${match.hero_id}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cache.size >= 1000) cache.delete(cache.keys().next().value!);
  const value = fetchOpenDotaMatchDetails(String(match.match_id)).then((details) => {
    const player = details.players.find((entry) => entry.playerSlot === match.player_slot && entry.heroId === match.hero_id &&
      (entry.accountId === dotaId || entry.accountId === null));
    if (details.matchId !== String(match.match_id) || !player) {
      throw new CompendiumError("OPEN_DOTA_UNAVAILABLE", "OpenDota не подтвердил ценность нужного игрока в этом матче.");
    }
    return player.netWorth ?? null;
  }).then((netWorth) => {
    if (netWorth === null) cache.delete(key);
    return netWorth;
  }).catch((error: unknown) => { cache.delete(key); throw error; });
  cache.set(key, { expiresAt: Date.now() + OPEN_DOTA_CACHE_TTL_MS, value });
  return value;
}

/** Match history can omit net worth; retrieve the exact final value from match details. */
export async function enrichStarRaceNetWorth(input: {
  dotaId: string; requirement: StarRaceQuestRequirement; matches: OpenDotaMatch[];
  dayStart: Date; dayEnd: Date; now: Date;
}): Promise<OpenDotaMatch[]> {
  if (input.requirement.kind !== "cumulative-net-worth") return input.matches;
  const eligible = new Set(scanRankedWins(input).map((win) => win.matchId));
  const result = [...input.matches];
  for (let start = 0; start < result.length; start += 3) {
    await Promise.all(result.slice(start, start + 3).map(async (match, offset) => {
      if (!eligible.has(String(match.match_id)) || match.net_worth != null) return;
      const netWorth = await playerNetWorth(input.dotaId, match);
      result[start + offset] = { ...match, net_worth: netWorth };
    }));
  }
  return result;
}

export function resetStarRaceNetWorthCacheForTests() { cache.clear(); }
