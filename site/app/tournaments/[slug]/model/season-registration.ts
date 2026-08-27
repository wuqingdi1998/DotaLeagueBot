import { SEASON_RANKED_WIN_WINDOW_DAYS } from "../../../../lib/season-ranked-wins/model";
import type { SeasonRoundRegistration } from "./season-types";

const RANKED_LOBBY_TYPE = 7;
const RANKED_WIN_WINDOW_MS =
  SEASON_RANKED_WIN_WINDOW_DAYS * 24 * 60 * 60 * 1_000;
const RANKED_WINS_REFRESH_INTERVAL_MS = 10 * 60 * 1_000;

export type SeasonRegistrationSort = "createdAt" | "nickname" | "tier";
export type SeasonRegistrationDirection = "ascending" | "descending";

const nicknameCollator = new Intl.Collator("ru", {
  numeric: true,
  sensitivity: "base",
});

export function sortSeasonRegistrations(
  registrations: SeasonRoundRegistration[],
  sort: SeasonRegistrationSort,
  direction: SeasonRegistrationDirection,
) {
  const multiplier = direction === "ascending" ? 1 : -1;
  return [...registrations].sort((left, right) => {
    let comparison = 0;
    if (sort === "nickname") {
      comparison = nicknameCollator.compare(left.nickname, right.nickname);
    } else if (sort === "tier") {
      if (left.tier_snapshot === null && right.tier_snapshot === null) {
        return nicknameCollator.compare(left.nickname, right.nickname);
      }
      if (left.tier_snapshot === null) return 1;
      if (right.tier_snapshot === null) return -1;
      comparison = left.tier_snapshot - right.tier_snapshot;
    } else {
      comparison =
        new Date(left.created_at).getTime() -
        new Date(right.created_at).getTime();
    }
    if (comparison !== 0) return comparison * multiplier;
    return nicknameCollator.compare(left.nickname, right.nickname);
  });
}

export function formatSeasonRegistrationMoment(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Europe/Moscow",
  }).format(new Date(value));
}

export function buildStratzRankedMatchesUrl(
  dotaId: string,
  currentTime: number,
) {
  const startDateTime = Math.floor(
    (currentTime - RANKED_WIN_WINDOW_MS) / 1_000,
  );
  return (
    `https://stratz.com/players/${encodeURIComponent(dotaId)}/matches` +
    `?lobbyType=${RANKED_LOBBY_TYPE}&startDateTime=${startDateTime}`
  );
}

export function formatSeasonRankedWinsRefreshCountdown(
  registrations: SeasonRoundRegistration[],
  currentTime: number,
): string | null {
  if (!Number.isFinite(currentTime)) return null;
  const checkedTimes = registrations
    .map((registration) => Date.parse(registration.wins_checked_at ?? ""))
    .filter(Number.isFinite);
  if (!checkedTimes.length) return null;

  const latestCheckedTime = Math.max(...checkedTimes);
  const elapsedTime = Math.max(0, currentTime - latestCheckedTime);
  const completedIntervals = Math.floor(
    elapsedTime / RANKED_WINS_REFRESH_INTERVAL_MS,
  );
  const nextRefreshTime =
    latestCheckedTime +
    (completedIntervals + 1) * RANKED_WINS_REFRESH_INTERVAL_MS;
  const remainingSeconds = Math.max(
    0,
    Math.ceil((nextRefreshTime - currentTime) / 1_000),
  );
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
