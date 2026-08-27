import { openDotaApiUrl } from "../../app/compendium/services/opendota-client";
import {
  SEASON_RANKED_WIN_WINDOW_DAYS,
  RANKED_WIN_ROLE_CONFIDENCE,
  type DotaPosition,
  type RankedMatchCandidate,
} from "./model";

type OpenDotaPlayerMatch = {
  match_id: number | string;
  player_slot: number;
  radiant_win: boolean;
  start_time: number;
  lobby_type: number;
  lane_role?: number | null;
  is_roaming?: boolean | null;
  gold_per_min?: number | null;
  last_hits?: number | null;
};

export function estimatedOpenDotaPosition(
  match: Pick<
    OpenDotaPlayerMatch,
    "gold_per_min" | "is_roaming" | "lane_role" | "last_hits"
  >,
): DotaPosition | null {
  if (match.is_roaming) return 4;
  if (match.lane_role === 2) return 2;

  const farmScore = Math.max(
    Number(match.gold_per_min ?? 0),
    Number(match.last_hits ?? 0) * 3,
  );
  if (match.lane_role === 1) return farmScore >= 350 ? 1 : 5;
  if (match.lane_role === 3) return farmScore >= 330 ? 3 : 4;
  return null;
}

function isOpenDotaPlayerMatch(value: unknown): value is OpenDotaPlayerMatch {
  if (!value || typeof value !== "object") return false;
  const match = value as Partial<OpenDotaPlayerMatch>;
  return (
    (typeof match.match_id === "number" || typeof match.match_id === "string") &&
    typeof match.player_slot === "number" &&
    typeof match.radiant_win === "boolean" &&
    typeof match.start_time === "number" &&
    match.lobby_type === 7
  );
}

export function openDotaMatchesFromPayload(
  payload: unknown,
): RankedMatchCandidate[] {
  if (!Array.isArray(payload)) return [];
  return payload.filter(isOpenDotaPlayerMatch).map((match) => {
    const isRadiant = match.player_slot < 128;
    return {
      matchId: String(match.match_id),
      role: estimatedOpenDotaPosition(match),
      roleConfidence: RANKED_WIN_ROLE_CONFIDENCE.opendota,
      source: "opendota",
      startedAt: new Date(match.start_time * 1_000),
      won: isRadiant === match.radiant_win,
    };
  });
}

export function openDotaMatchPositionFromPayload(
  payload: unknown,
  dotaId: string,
): DotaPosition | null {
  if (!payload || typeof payload !== "object") return null;
  const players = (payload as { players?: unknown }).players;
  if (!Array.isArray(players)) return null;
  const player = players.find((candidate) => {
    if (!candidate || typeof candidate !== "object") return false;
    const accountId = (candidate as { account_id?: number | string }).account_id;
    return String(accountId ?? "") === dotaId;
  });
  if (!player || typeof player !== "object") return null;
  return estimatedOpenDotaPosition(
    player as Pick<
      OpenDotaPlayerMatch,
      "gold_per_min" | "is_roaming" | "lane_role" | "last_hits"
    >,
  );
}

export async function fetchOpenDotaMatchPosition(
  matchId: string,
  dotaId: string,
): Promise<DotaPosition | null> {
  const url = openDotaApiUrl(`/api/matches/${encodeURIComponent(matchId)}`);
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(6_000),
  });
  if (!response.ok) return null;
  return openDotaMatchPositionFromPayload(await response.json(), dotaId);
}

export async function fetchOpenDotaRankedMatches(
  dotaId: string,
): Promise<RankedMatchCandidate[]> {
  const url = openDotaApiUrl(
    `/api/players/${encodeURIComponent(dotaId)}/matches`,
  );
  url.searchParams.set("date", String(SEASON_RANKED_WIN_WINDOW_DAYS));
  url.searchParams.set("lobby_type", "7");
  for (const field of [
    "player_slot",
    "radiant_win",
    "start_time",
    "lobby_type",
    "lane_role",
    "is_roaming",
    "gold_per_min",
    "last_hits",
  ]) {
    url.searchParams.append("project", field);
  }

  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`OpenDota returned HTTP ${response.status}`);
  }
  return openDotaMatchesFromPayload(await response.json());
}
