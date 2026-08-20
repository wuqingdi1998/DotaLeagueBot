const CHINA_REPLAY_CLUSTERS = new Set([413, 415, 417]);

function buildReplayUrl(matchId: string, clusterId: number, replaySalt: string): string {
  const domain = CHINA_REPLAY_CLUSTERS.has(clusterId)
    ? "dota2.com.cn"
    : "valve.net";
  return `http://replay${clusterId}.${domain}/570/${matchId}_${replaySalt}.dem.bz2`;
}

export async function fetchStratzReplayUrl(matchId: string): Promise<string | null> {
  const token = process.env.STRATZ_TOKEN?.trim();
  if (!token || !/^\d+$/.test(matchId)) return null;
  try {
    const response = await fetch("https://api.stratz.com/graphql", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "DotaLeagueBot/1.0",
      },
      body: JSON.stringify({
        query: `{ match(id: ${matchId}) { clusterId replaySalt } }`,
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return null;
    const match = (payload as { data?: { match?: unknown } }).data?.match;
    if (!match || typeof match !== "object") return null;
    const values = match as Record<string, unknown>;
    const clusterId = values.clusterId;
    const replaySalt = values.replaySalt;
    if (
      typeof clusterId !== "number" ||
      !Number.isSafeInteger(clusterId) ||
      clusterId <= 0 ||
      (typeof replaySalt !== "number" && typeof replaySalt !== "string") ||
      !/^\d+$/.test(String(replaySalt))
    ) {
      return null;
    }
    return buildReplayUrl(matchId, clusterId, String(replaySalt));
  } catch {
    return null;
  }
}
