import { DOTABUFF_BROWSER_TIMEOUT_MS, DOTABUFF_ORIGIN, type BrowserRankedMatch, type DotabuffBrowserImport } from "../../lib/season-ranked-wins/browser-import";

export const LEAGUE_ORIGIN = "https://lsesports.ru";
export type DotabuffJob = {
  id: string;
  ownerTabId: number;
  dotabuffTabId: number;
  dotaId: string;
  page: number;
  startedAt: string;
  state: "waiting" | "reading" | "complete" | "error";
  message: string;
  matches: BrowserRankedMatch[];
  result?: DotabuffBrowserImport;
};

export function isLeagueSender(url: string | undefined): boolean {
  if (!url) return false;
  const parsed = new URL(url);
  return parsed.origin === LEAGUE_ORIGIN && parsed.pathname.startsWith("/tournaments/");
}

export function isJobPage(url: string | undefined, job: DotabuffJob): boolean {
  if (!url) return false;
  const parsed = new URL(url);
  return parsed.origin === DOTABUFF_ORIGIN && parsed.pathname === `/players/${job.dotaId}/matches`
    && parsed.searchParams.get("date") === "month"
    && parsed.searchParams.get("lobby_type") === "ranked_matchmaking"
    && Number(parsed.searchParams.get("page") || 1) === job.page;
}

export function isJobExpired(job: DotabuffJob): boolean {
  return Date.now() - Date.parse(job.startedAt) > DOTABUFF_BROWSER_TIMEOUT_MS;
}

export function publicJobStatus(job: DotabuffJob) {
  return { state: job.state, message: job.message, result: job.result };
}
