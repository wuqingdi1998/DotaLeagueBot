import { fetchDotaBuffMatchPage } from "./dotabuff";
import { dotabuffMonthlyMatchesFromHtml } from "./dotabuff-parser";
export { dotabuffMonthlyMatchesFromHtml } from "./dotabuff-parser";
import { SEASON_RANKED_WIN_WINDOW_DAYS, type RankedMatchCandidate } from "./model";

const MAX_MONTHLY_PAGES = 20;

export async function fetchDotaBuffMonthlyRankedMatches(dotaId: string, now: Date) {
  const matches = new Map<string, RankedMatchCandidate>();
  const cutoff = now.getTime() - SEASON_RANKED_WIN_WINDOW_DAYS * 86_400_000;
  for (let page = 1; page <= MAX_MONTHLY_PAGES; page += 1) {
    const html = await fetchDotaBuffMatchPage(dotaId, page, true);
    const pageMatches = dotabuffMonthlyMatchesFromHtml(html);
    let hasNewMatches = false;
    for (const match of pageMatches) {
      if (match.won && match.startedAt.getTime() >= cutoff && match.startedAt <= now && match.role === null) {
        throw new Error("DotaBuff has winning matches without roles");
      }
      if (!matches.has(match.matchId)) hasNewMatches = true;
      matches.set(match.matchId, match);
    }
    const hasNextPage = /<a\b[^>]*rel=["']next["']/i.test(html)
      || /<a\b[^>]*href=["'][^"']*[?&](?:amp;)?page=\d+[^"']*["'][^>]*>\s*(?:Next|Next &raquo;|›|»)/i.test(html);
    if (!pageMatches.length || pageMatches.every((match) => match.startedAt.getTime() < cutoff) || !hasNextPage) {
      return [...matches.values()];
    }
    if (!hasNewMatches) throw new Error("DotaBuff repeated a history page");
  }
  throw new Error("DotaBuff monthly history exceeds the request limit");
}
