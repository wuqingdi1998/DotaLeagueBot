import {
  SEASON_RANKED_WIN_WINDOW_DAYS,
  type DotaPosition,
  type RankedMatchCandidate,
} from "./model";

const DOTABUFF_ORIGIN = "https://www.dotabuff.com";
const MAX_DOTABUFF_PAGES = 3;

function textContent(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function dotabuffPosition(rowText: string, rowHtml: string): DotaPosition | null {
  const isCore = /\bCore\b/i.test(rowText) || /role[-_ ]core/i.test(rowHtml);
  const isSupport =
    /\bSupport\b/i.test(rowText) || /role[-_ ]support/i.test(rowHtml);
  const isSafeLane = /Safe Lane/i.test(rowText);
  const isMidLane = /Mid Lane/i.test(rowText);
  const isOffLane = /Off Lane/i.test(rowText);
  const isRoaming = /Roaming/i.test(rowText);

  if (isCore && isSafeLane) return 1;
  if (isCore && isMidLane) return 2;
  if (isCore && isOffLane) return 3;
  if (isSupport && (isOffLane || isRoaming)) return 4;
  if (isSupport && isSafeLane) return 5;
  return null;
}

function rowDate(rowHtml: string): Date | null {
  const dateTime = rowHtml.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1];
  if (dateTime) {
    const value = new Date(dateTime);
    if (!Number.isNaN(value.getTime())) return value;
  }
  const unixTime = Number(
    rowHtml.match(/data-value=["'](\d{10})["']/i)?.[1] ?? 0,
  );
  return unixTime > 0 ? new Date(unixTime * 1_000) : null;
}

export function dotabuffMatchesFromHtml(html: string): RankedMatchCandidate[] {
  const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
  const matches: RankedMatchCandidate[] = [];
  for (const rowHtml of rows) {
    const matchId = rowHtml.match(/href=["'][^"']*\/matches\/(\d+)/i)?.[1];
    const startedAt = rowDate(rowHtml);
    if (!matchId || !startedAt) continue;
    const rowText = textContent(rowHtml);
    const won = /\bWon Match\b/i.test(rowText) || /result[-_ ]won/i.test(rowHtml);
    const role = dotabuffPosition(rowText, rowHtml);
    matches.push({
      matchId,
      role,
      roleConfidence: role === null ? 0 : 2,
      source: "dotabuff",
      startedAt,
      won,
    });
  }
  return matches;
}

export async function fetchDotaBuffRankedMatches(
  dotaId: string,
  now = new Date(),
): Promise<RankedMatchCandidate[]> {
  const cutoff = new Date(
    now.getTime() - SEASON_RANKED_WIN_WINDOW_DAYS * 24 * 60 * 60 * 1_000,
  );
  const matches: RankedMatchCandidate[] = [];

  for (let page = 1; page <= MAX_DOTABUFF_PAGES; page += 1) {
    const url = new URL(`/players/${encodeURIComponent(dotaId)}/matches`, DOTABUFF_ORIGIN);
    url.searchParams.set("date", "month");
    url.searchParams.set("lobby_type", "ranked_matchmaking");
    url.searchParams.set("page", String(page));
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Linkens-Sphere-Season-Win-Checker/1.0",
      },
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) {
      throw new Error(`DotaBuff returned HTTP ${response.status}`);
    }
    const html = await response.text();
    if (/cf-chl-|Just a moment/i.test(html)) {
      throw new Error("DotaBuff returned an anti-bot challenge");
    }
    const pageMatches = dotabuffMatchesFromHtml(html);
    if (!pageMatches.length) break;
    matches.push(...pageMatches);
    if (pageMatches.some((match) => match.startedAt < cutoff)) break;
  }

  return matches;
}
