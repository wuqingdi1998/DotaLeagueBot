import { OPEN_DOTA_CACHE_TTL_MS } from "../model/constants";
import { CompendiumError } from "../model/errors";
import type { OpenDotaMatch } from "../model/types";

type MatchCacheEntry = {
  expiresAt: number;
  matches: OpenDotaMatch[];
};

const matchCache = new Map<string, MatchCacheEntry>();
const pendingMatchRequests = new Map<string, Promise<OpenDotaMatch[]>>();

function isOpenDotaMatch(value: unknown): value is OpenDotaMatch {
  if (!value || typeof value !== "object") return false;
  const match = value as Partial<OpenDotaMatch>;
  return (
    (typeof match.match_id === "number" || typeof match.match_id === "string") &&
    typeof match.player_slot === "number" &&
    typeof match.radiant_win === "boolean" &&
    typeof match.duration === "number" &&
    typeof match.game_mode === "number" &&
    typeof match.lobby_type === "number" &&
    typeof match.hero_id === "number" &&
    typeof match.start_time === "number" &&
    (match.tower_damage === undefined ||
      match.tower_damage === null ||
      (typeof match.tower_damage === "number" && match.tower_damage >= 0))
  );
}

async function requestRecentPlayerMatches(
  dotaId: string,
): Promise<OpenDotaMatch[]> {
  const url = new URL(
    `/api/players/${encodeURIComponent(dotaId)}/matches`,
    "https://api.opendota.com",
  );
  url.searchParams.set("date", "1");
  for (const field of ["hero_id", "start_time", "tower_damage"]) {
    url.searchParams.append("project", field);
  }
  const apiKey = process.env.OPENDOTA_API_KEY?.trim();
  if (apiKey) url.searchParams.set("api_key", apiKey);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("OpenDota match request failed", {
        status: response.status,
        dotaId,
      });
      throw new CompendiumError(
        "OPEN_DOTA_UNAVAILABLE",
        "OpenDota недоступен",
      );
    }
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error("OpenDota returned a non-array match payload");
    }
    const matches = payload.filter(isOpenDotaMatch);
    matchCache.set(dotaId, {
      matches,
      expiresAt: Date.now() + OPEN_DOTA_CACHE_TTL_MS,
    });
    return matches;
  } catch (error) {
    if (error instanceof CompendiumError) throw error;
    console.error("OpenDota match request failed", {
      dotaId,
      reason: error instanceof Error ? error.message : "unknown error",
    });
    throw new CompendiumError(
      "OPEN_DOTA_UNAVAILABLE",
      "OpenDota недоступен",
    );
  }
}

export async function fetchRecentPlayerMatches(
  dotaId: string,
  options: { forceRefresh?: boolean } = {},
): Promise<OpenDotaMatch[]> {
  const cached = matchCache.get(dotaId);
  if (
    !options.forceRefresh &&
    cached &&
    cached.expiresAt > Date.now()
  ) {
    return cached.matches;
  }
  const pending = pendingMatchRequests.get(dotaId);
  if (pending) return pending;

  const request = requestRecentPlayerMatches(dotaId).finally(() => {
    pendingMatchRequests.delete(dotaId);
  });
  pendingMatchRequests.set(dotaId, request);
  return request;
}

export function resetOpenDotaCacheForTests() {
  matchCache.clear();
  pendingMatchRequests.clear();
}
