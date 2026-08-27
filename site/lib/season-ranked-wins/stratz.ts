import {
  SEASON_RANKED_WIN_WINDOW_DAYS,
  isDotaPosition,
  type DotaPosition,
  type RankedMatchCandidate,
} from "./model";

const STRATZ_API_URL = "https://api.stratz.com/graphql";
const STRATZ_PAGE_SIZE = 50;
const STRATZ_MAX_PAGES = 10;
const STRATZ_REQUEST_TIMEOUT_MS = 45_000;

type StratzMatch = {
  id: number | string;
  lobbyType: number | string;
  startDateTime: number;
  players: Array<
    | {
        steamAccountId: number | string;
        position: number | string | null;
        isVictory: boolean;
      }
    | null
  >;
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

function hasStratzErrors(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const errors = (payload as { errors?: unknown }).errors;
  return Array.isArray(errors) && errors.length > 0;
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
      (candidate) =>
        candidate !== null && String(candidate.steamAccountId) === dotaId,
    );
    if (!player || typeof player.isVictory !== "boolean") continue;
    candidates.push({
      matchId: String(match.id),
      role: stratzPosition(player.position),
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
        players(steamAccountId: ${dotaId}) {
          steamAccountId
          position
          isVictory
        }
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
  let hasCompletedPage = false;

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
    if (!response.ok) {
      if (!hasCompletedPage) {
        throw new Error(
          `Stratz match page ${page + 1} returned HTTP ${response.status}`,
        );
      }
      break;
    }
    const payload: unknown = await response.json();
    const rawMatches = rawStratzMatches(payload);
    const hasUnavailablePage =
      !hasStratzMatchList(payload) ||
      (hasStratzErrors(payload) && rawMatches.length === 0);
    if (hasUnavailablePage) {
      if (!hasCompletedPage) {
        throw new Error("Stratz did not return the first match page");
      }
      break;
    }
    hasCompletedPage = true;
    const pageMatches = stratzMatchesFromPayload(payload, dotaId);
    if (!rawMatches.length) break;
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
      break;
    }
  }
  return matches;
}
