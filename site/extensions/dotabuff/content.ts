/// <reference types="chrome" />
import { dotabuffMonthlyMatchesFromHtml } from "../../lib/season-ranked-wins/dotabuff-parser";
import { hasUnresolvedBrowserWins } from "../../lib/season-ranked-wins/browser-import";
import { SEASON_RANKED_WIN_WINDOW_DAYS } from "../../lib/season-ranked-wins/model";

let isRunning = false;
let isFinished = false;
let hasReportedChallenge = false;

function hasChallenge() {
  return /Just a moment|Один момент|Выполнение проверки безопасности/i.test(document.title)
    || !!document.querySelector('#challenge-running, #challenge-stage, iframe[src*="challenges.cloudflare.com"]');
}

function hasNextPage(): boolean {
  return !!document.querySelector('a[rel="next"]')
    || Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).some((link) => {
      const url = new URL(link.href);
      return url.pathname === location.pathname && url.searchParams.has("page")
        && /^(Next|Следующая|Далее|›|»)(\s|$)/i.test(link.textContent?.trim() ?? "");
    });
}

async function readPage() {
  if (isRunning || isFinished) return;
  isRunning = true;
  try {
    const job = await chrome.runtime.sendMessage({ type: "getJob" });
    if (!job?.id) return;
    if (hasChallenge()) {
      if (!hasReportedChallenge) {
        await chrome.runtime.sendMessage({ type: "waiting", ...job });
        hasReportedChallenge = true;
      }
      return;
    }
    if (document.readyState !== "complete") return;
    const matches = dotabuffMonthlyMatchesFromHtml(document.documentElement.outerHTML);
    const now = new Date(job.startedAt);
    if (hasUnresolvedBrowserWins(matches, now)) {
      throw new Error("У части побед Dotabuff не указал роль. Полный подсчёт невозможен; прежние значения сохранены");
    }
    const cutoff = now.getTime() - SEASON_RANKED_WIN_WINDOW_DAYS * 86_400_000;
    const hasMore = matches.length > 0 && !matches.every((match) => match.startedAt.getTime() < cutoff) && hasNextPage();
    const response = await chrome.runtime.sendMessage({ type: "page", ...job, hasNextPage: hasMore,
      matches: matches.map((match) => ({ ...match, startedAt: match.startedAt.toISOString() })) });
    if (response?.error) throw new Error(response.error);
    isFinished = true;
  } catch (error) {
    const job = await chrome.runtime.sendMessage({ type: "getJob" }).catch(() => null);
    if (job?.id) {
      await chrome.runtime.sendMessage({ type: "error", ...job,
        error: `Не удалось прочитать статистику Dotabuff: ${error instanceof Error ? error.message : "неизвестная ошибка"}. Прежние значения сохранены` });
    }
    isFinished = true;
  } finally {
    isRunning = false;
  }
}

void readPage();
const interval = setInterval(() => {
  if (isFinished) clearInterval(interval);
  else void readPage();
}, 1_000);
