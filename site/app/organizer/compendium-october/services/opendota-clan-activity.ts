import { openDotaApiUrl } from "@/app/compendium/services/opendota-client";

export type OctoberOpenDotaActivity = {
  matchesLastThreeMonths: number;
  rankedMatchesLastThreeMonths: number;
  lastMatchAt: string | null;
  status: "available" | "unavailable";
};

const THREE_MONTH_DAYS = "90";
const RANKED_LOBBY_TYPE = 7;
const REQUEST_CONCURRENCY = 6;
const REQUEST_ATTEMPTS = 3;

function activityFromPayload(payload: unknown): OctoberOpenDotaActivity | null {
  if (!Array.isArray(payload)) return null;
  const matches = payload.filter((item): item is { lobby_type: number; start_time: number } =>
    Boolean(item) &&
    typeof item === "object" &&
    typeof (item as { lobby_type?: unknown }).lobby_type === "number" &&
    typeof (item as { start_time?: unknown }).start_time === "number",
  );
  const latestStartTime = Math.max(0, ...matches.map((match) => match.start_time));
  return {
    matchesLastThreeMonths: matches.length,
    rankedMatchesLastThreeMonths: matches.filter(
      (match) => match.lobby_type === RANKED_LOBBY_TYPE,
    ).length,
    lastMatchAt: latestStartTime
      ? new Date(latestStartTime * 1000).toISOString()
      : null,
    status: "available",
  };
}

async function fetchPlayerActivity(
  dotaId: string,
): Promise<OctoberOpenDotaActivity> {
  const url = openDotaApiUrl(`/api/players/${encodeURIComponent(dotaId)}/matches`);
  url.searchParams.set("date", THREE_MONTH_DAYS);
  url.searchParams.append("project", "lobby_type");
  url.searchParams.append("project", "start_time");
  for (let attempt = 1; attempt <= REQUEST_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
        cache: "no-store",
      });
      const activity = response.ok
        ? activityFromPayload(await response.json())
        : null;
      if (activity) return activity;
    } catch {
      // The next attempt handles temporary OpenDota or network failures.
    }
    if (attempt < REQUEST_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  return {
    matchesLastThreeMonths: 0,
    rankedMatchesLastThreeMonths: 0,
    lastMatchAt: null,
    status: "unavailable",
  };
}

export async function loadOctoberOpenDotaActivity(
  players: readonly { discordId: string; dotaId: string }[],
): Promise<Map<string, OctoberOpenDotaActivity>> {
  const results = new Map<string, OctoberOpenDotaActivity>();
  let cursor = 0;
  async function worker() {
    while (cursor < players.length) {
      const player = players[cursor];
      cursor += 1;
      results.set(player.discordId, await fetchPlayerActivity(player.dotaId));
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(REQUEST_CONCURRENCY, players.length) },
      () => worker(),
    ),
  );
  return results;
}
