import type { DotaPosition } from "./model";

const DOTABUFF_ORIGIN = "https://www.dotabuff.com";
const MAX_DOTABUFF_PAGES = 5;

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

export function dotabuffPosition(rowHtml: string): DotaPosition | null {
  const rowText = textContent(rowHtml);
  const searchableRow = `${rowText} ${rowHtml}`;
  const isCore = /\bCore\b|role[-_ ]core/i.test(searchableRow);
  const isSupport = /\bSupport\b|role[-_ ]support/i.test(searchableRow);
  const isSafeLane = /Safe Lane/i.test(searchableRow);
  const isMidLane = /Mid Lane/i.test(searchableRow);
  const isOffLane = /Off Lane/i.test(searchableRow);

  if (isCore && isSafeLane) return 1;
  if (isCore && isMidLane) return 2;
  if (isCore && isOffLane) return 3;
  if (isSupport && isOffLane) return 4;
  if (isSupport && isSafeLane) return 5;
  return null;
}

export async function fetchDotaBuffMatchPage(dotaId: string, page: number, isMonthly = false): Promise<string> {
  const url = new URL(`/players/${encodeURIComponent(dotaId)}/matches`, DOTABUFF_ORIGIN);
  url.searchParams.set("lobby_type", "ranked_matchmaking");
  url.searchParams.set("page", String(page));
  if (isMonthly) url.searchParams.set("date", "month");
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "Linkens-Sphere-Season-Win-Checker/1.0",
    },
    signal: AbortSignal.timeout(3_000),
  });
  if (!response.ok) throw new Error(`DotaBuff returned HTTP ${response.status}`);
  const html = await response.text();
  if (/cf-chl-|Just a moment/i.test(html)) {
    throw new Error("DotaBuff returned an anti-bot challenge");
  }
  return html;
}

function matchIdsFromHtml(html: string): string[] {
  return [...html.matchAll(/href=["'][^"']*\/matches\/(\d+)/gi)].map(
    (match) => match[1],
  );
}

export function dotabuffRolesFromHtml(
  html: string,
  requestedMatchIds: ReadonlySet<string>,
): Map<string, DotaPosition> {
  const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
  const roles = new Map<string, DotaPosition>();

  for (const rowHtml of rows) {
    const matchId = rowHtml.match(/href=["'][^"']*\/matches\/(\d+)/i)?.[1];
    if (!matchId || !requestedMatchIds.has(matchId)) continue;
    const role = dotabuffPosition(rowHtml);
    if (role !== null) roles.set(matchId, role);
  }

  return roles;
}

export async function fetchDotaBuffRolesForMatches({
  dotaId,
  matchIds,
}: {
  dotaId: string;
  matchIds: string[];
}): Promise<Map<string, DotaPosition>> {
  const requestedMatchIds = new Set(
    matchIds.filter((matchId) => /^\d+$/.test(matchId)),
  );
  const foundRoles = new Map<string, DotaPosition>();
  if (!requestedMatchIds.size) return foundRoles;

  for (let page = 1; page <= MAX_DOTABUFF_PAGES; page += 1) {
    const html = await fetchDotaBuffMatchPage(dotaId, page);

    for (const [matchId, role] of dotabuffRolesFromHtml(
      html,
      requestedMatchIds,
    )) {
      foundRoles.set(matchId, role);
    }
    if (
      foundRoles.size === requestedMatchIds.size ||
      matchIdsFromHtml(html).length === 0
    ) {
      break;
    }
  }

  return foundRoles;
}
