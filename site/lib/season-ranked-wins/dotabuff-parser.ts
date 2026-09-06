import type { DotaPosition, RankedMatchCandidate } from "./model";

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

/** Only complete, recognizable match histories may replace a saved count. */
export function dotabuffMonthlyMatchesFromHtml(html: string): RankedMatchCandidate[] {
  const matches: RankedMatchCandidate[] = [];
  for (const row of html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? []) {
    const matchId = row.match(/href=["'][^"']*\/matches\/(\d+)/i)?.[1];
    if (!matchId) continue;
    const date = row.match(/<time\b[^>]*datetime=["']([^"']+)["']/i)?.[1];
    const startedAt = new Date(date ?? "");
    const result = row.replace(/<[^>]+>/g, " ").match(/\b(Won|Lost|Abandoned)\s+Match\b/i)?.[1];
    if (!Number.isFinite(startedAt.getTime()) || !result) {
      throw new Error("DotaBuff match date or result is missing");
    }
    matches.push({ matchId, startedAt, won: result.toLowerCase() === "won", role: dotabuffPosition(row) });
  }
  if (!matches.length && !/No matches found|No matches to display/i.test(html)) {
    throw new Error("DotaBuff match history is unavailable");
  }
  return matches;
}
