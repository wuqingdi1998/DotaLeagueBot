import { SEASON_RANKED_WIN_WINDOW_DAYS } from "../../../../lib/season-ranked-wins/model";
import type { SeasonRoundRegistration } from "./season-types";

const RANKED_LOBBY_TYPE = 7;
const RANKED_WIN_WINDOW_MS =
  SEASON_RANKED_WIN_WINDOW_DAYS * 24 * 60 * 60 * 1_000;

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
