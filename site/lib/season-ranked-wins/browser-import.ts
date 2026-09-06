import { isDotaPosition, SEASON_RANKED_WIN_WINDOW_DAYS, type RankedMatchCandidate } from "./model";

export const DOTABUFF_BROWSER_MAX_PAGES = 20;
export const DOTABUFF_BROWSER_MAX_MATCHES = 2_000;
export const DOTABUFF_BROWSER_TIMEOUT_MS = 15 * 60_000;
export const DOTABUFF_ORIGIN = "https://www.dotabuff.com";
export const DOTABUFF_EXTENSION_DOWNLOAD = "/downloads/linkens-dotabuff-helper.zip";

export type BrowserRankedMatch = Omit<RankedMatchCandidate, "startedAt"> & { startedAt: string };
export type DotabuffBrowserImport = {
  dotaId: string;
  startedAt: string;
  completedAt: string;
  matches: BrowserRankedMatch[];
};

export function dotabuffBrowserMatchUrl(dotaId: string, page: number): string {
  const url = new URL(`/players/${encodeURIComponent(dotaId)}/matches`, DOTABUFF_ORIGIN);
  url.searchParams.set("lobby_type", "ranked_matchmaking");
  url.searchParams.set("date", "month");
  url.searchParams.set("page", String(page));
  return url.href;
}

/** Browser input is organizer-supplied evidence, never a trusted provider signature. */
export function parseDotabuffBrowserImport(value: unknown, now = new Date()): DotabuffBrowserImport | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (typeof body.dotaId !== "string" || !/^\d{1,10}$/.test(body.dotaId)
    || typeof body.startedAt !== "string" || typeof body.completedAt !== "string"
    || !Array.isArray(body.matches) || body.matches.length > DOTABUFF_BROWSER_MAX_MATCHES) return null;
  const started = Date.parse(body.startedAt);
  const completed = Date.parse(body.completedAt);
  if (!Number.isFinite(started) || !Number.isFinite(completed) || completed < started
    || completed - started > DOTABUFF_BROWSER_TIMEOUT_MS || completed > now.getTime() + 60_000
    || now.getTime() - completed > DOTABUFF_BROWSER_TIMEOUT_MS) return null;
  const matches: BrowserRankedMatch[] = [];
  for (const value of body.matches) {
    if (!value || typeof value !== "object") return null;
    const match = value as Record<string, unknown>;
    if (typeof match.matchId !== "string" || !/^\d{1,20}$/.test(match.matchId)
      || typeof match.startedAt !== "string" || !Number.isFinite(Date.parse(match.startedAt))
      || typeof match.won !== "boolean"
      || (match.role !== null && (typeof match.role !== "number" || !isDotaPosition(match.role)))) return null;
    matches.push({ matchId: match.matchId, startedAt: match.startedAt, won: match.won, role: match.role });
  }
  return { dotaId: body.dotaId, startedAt: body.startedAt, completedAt: body.completedAt, matches };
}

export function hasUnresolvedBrowserWins(matches: RankedMatchCandidate[], now: Date): boolean {
  const cutoff = now.getTime() - SEASON_RANKED_WIN_WINDOW_DAYS * 86_400_000;
  return matches.some((match) => match.won && match.role === null
    && match.startedAt.getTime() >= cutoff && match.startedAt <= now);
}
