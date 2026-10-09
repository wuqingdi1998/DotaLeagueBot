import { runeChallengeAccessRoleNames } from "./subscription-roles";
import { OCTOBER_COMPENDIUM_END_AT } from "./october-compendium-schedule";

export const OCTOBER_PUBLIC_LAUNCH_AT = "2026-10-03T22:30:00+03:00";
export const OCTOBER_CLAN_FORMATION_AT = "2026-10-04T23:30:00+03:00";
export const OCTOBER_CLAN_PUBLICATION_AT = "2026-10-05T00:00:00+03:00";
export const OCTOBER_DAILY_OPENING_LABEL =
  "5 октября в 00:00 по московскому времени";

export const OCTOBER_RESERVATION_ROLE_NAMES = runeChallengeAccessRoleNames;

export type OctoberCompendiumPhase =
  | "hidden"
  | "reservation"
  | "formation"
  | "published"
  | "finished";

export function octoberCompendiumPhase(
  now: Date = new Date(),
): OctoberCompendiumPhase {
  const currentTime = now.getTime();
  if (currentTime < Date.parse(OCTOBER_PUBLIC_LAUNCH_AT)) return "hidden";
  if (currentTime < Date.parse(OCTOBER_CLAN_FORMATION_AT)) return "reservation";
  if (currentTime < Date.parse(OCTOBER_CLAN_PUBLICATION_AT)) return "formation";
  if (currentTime >= Date.parse(OCTOBER_COMPENDIUM_END_AT)) return "finished";
  return "published";
}

export function octoberDailyRewardStars(dateKey: string): 1 | 2 {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 || weekday === 6 ? 2 : 1;
}
