import {
  SEASON_RANKED_WIN_WINDOW_DAYS,
  RANKED_WIN_ROLE_CONFIDENCE,
  isDotaPosition,
  type DotaPosition,
  type RankedMatchCandidate,
} from "./model";

const STRATZ_API_URL = "https://api.stratz.com/graphql";
const STRATZ_PAGE_SIZE = 50;
const STRATZ_MAX_PAGES = 10;
const STRATZ_REQUEST_TIMEOUT_MS = 12_000;

type StratzMatch = {
  id: number | string;
  lobbyType: number | string;
  startDateTime: number;
  players: Array<{
    steamAccountId: number | string;
    position: number | string | null;
    isVictory: boolean;
  }>;
};

function stratzPosition(value: number | string | null): DotaPosition | null {
  const position = Number(String(value ?? "").replace(/^POSITION_/, ""));
  return isDotaPosition(position) ? position : null;
}

function isRankedLobby(value: number | string): boolean {
  const lobby = String(value).toUpperCase();
  return lobby === "7" || lobby === "RANKED";
}

function rawStratzMatches(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") return [];
  const matches = (payload as { data?: { player?: { matches?: unknown } } })
    .data?.player?.matches;
  return Array.isArray(matches) ? matches : [];
}

function hasStratzMatchList(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  return Array.isArray(
    (payload as { data?: { player?: { matches?: unknown } } }).data?.player
      ?.matches,
  );
}

export function stratzMatchesFromPayload(
  payload: unknown,
  dotaId: string,
): RankedMatchCandidate[] {
  const candidates: RankedMatchCandidate[] = [];
  for (const value of rawStratzMatches(payload)) {
    if (!value || typeof value !== "object") continue;
    const match = value as Partial<StratzMatch>;
    if (
      (typeof match.id !== "number" && typeof match.id !== "string") ||
      typeof match.startDateTime !== "number" ||
      !Array.isArray(match.players) ||
      match.lobbyType === undefined ||
      !isRankedLobby(match.lobbyType)
    ) {
      continue;
    }
    const player = match.players.find(
      (candidate) => String(candidate.steamAccountId) === dotaId,
    );
    if (!player || typeof player.isVictory !== "boolean") continue;
    candidates.push({
      matchId: String(match.id),
      role: stratzPosition(player.position),
      roleConfidence: RANKED_WIN_ROLE_CONFIDENCE.stratz,
      source: "stratz",
      startedAt: new Date(match.startDateTime * 1_000),
      won: player.isVictory,
    });
  }
  return candidates;
}

function playerMatchesQuery(dotaId: string, skip: number): string {
  return `{
    player(steamAccountId: ${dotaId}) {
      matches(request: { take: ${STRATZ_PAGE_SIZE}, skip: ${skip} }) {
        id
        lobbyType
        startDateTime
        players { steamAccountId position isVictory }
      }
    }
  }`;
}

export async function fetchStratzRankedMatches(
  dotaId: string,
  now = new Date(),
): Promise<RankedMatchCandidate[]> {
  const token = process.env.STRATZ_TOKEN?.trim();
  if (!token || !/^\d{1,10}$/.test(dotaId)) {
    throw new Error("Stratz is not configured or the Dota ID is invalid");
  }
  const cutoff = new Date(
    now.getTime() - SEASON_RANKED_WIN_WINDOW_DAYS * 24 * 60 * 60 * 1_000,
  );
  const matches: RankedMatchCandidate[] = [];
  let coveredEntireWindow = false;

  for (let page = 0; page < STRATZ_MAX_PAGES; page += 1) {
    const response = await fetch(STRATZ_API_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "DotaLeagueBot/1.0",
      },
      body: JSON.stringify({
        query: playerMatchesQuery(dotaId, page * STRATZ_PAGE_SIZE),
      }),
      signal: AbortSignal.timeout(STRATZ_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Stratz returned HTTP ${response.status}`);
    const payload: unknown = await response.json();
    if (
      payload &&
      typeof payload === "object" &&
      Array.isArray((payload as { errors?: unknown[] }).errors) &&
      (payload as { errors: unknown[] }).errors.length > 0
    ) {
      throw new Error("Stratz returned a GraphQL error");
    }
    if (!hasStratzMatchList(payload)) {
      throw new Error("Stratz returned an incomplete player response");
    }
    const pageMatches = stratzMatchesFromPayload(payload, dotaId);
    const rawMatches = rawStratzMatches(payload);
    if (!rawMatches.length) {
      coveredEntireWindow = true;
      break;
    }
    matches.push(...pageMatches);
    const oldestStartTime = Math.min(
      ...rawMatches.map((match) =>
        match &&
        typeof match === "object" &&
        typeof (match as { startDateTime?: unknown }).startDateTime === "number"
          ? Number((match as { startDateTime: number }).startDateTime)
          : Number.POSITIVE_INFINITY,
      ),
    );
    if (
      oldestStartTime * 1_000 <= cutoff.getTime() ||
      rawMatches.length < STRATZ_PAGE_SIZE
    ) {
      coveredEntireWindow = true;
      break;
    }
  }
  if (!coveredEntireWindow) {
    throw new Error("Stratz did not return the entire thirty-day window");
  }
  return matches;
}
