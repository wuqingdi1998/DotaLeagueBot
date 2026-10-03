import { runeChallengeAccessRoleNames } from "./subscription-roles";

export const OCTOBER_PUBLIC_LAUNCH_AT = "2026-10-03T21:00:00+03:00";
export const OCTOBER_CLAN_FORMATION_AT = "2026-10-05T23:50:00+03:00";
export const OCTOBER_CLAN_PUBLICATION_AT = "2026-10-06T00:00:00+03:00";
export const OCTOBER_DAILY_OPENING_LABEL =
  "6 октября в 00:00 по московскому времени";

export const OCTOBER_RESERVATION_ROLE_NAMES = runeChallengeAccessRoleNames;

export type OctoberCompendiumPhase =
  | "hidden"
  | "reservation"
  | "formation"
  | "published";

export function octoberCompendiumPhase(
  now: Date = new Date(),
): OctoberCompendiumPhase {
  const currentTime = now.getTime();
  if (currentTime < Date.parse(OCTOBER_PUBLIC_LAUNCH_AT)) return "hidden";
  if (currentTime < Date.parse(OCTOBER_CLAN_FORMATION_AT)) return "reservation";
  if (currentTime < Date.parse(OCTOBER_CLAN_PUBLICATION_AT)) return "formation";
  return "published";
}

export function octoberDailyRewardStars(dateKey: string): 1 | 2 {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 || weekday === 6 ? 2 : 1;
}
