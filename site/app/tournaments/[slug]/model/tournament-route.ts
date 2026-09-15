import type { TournamentTab } from "./types";

export const tournamentSectionTabs = [
  "standings",
  "teams",
  "matches",
  "groups",
  "playoffs",
  "rules",
  "admin",
] as const satisfies readonly TournamentTab[];

export type TournamentSectionTab = (typeof tournamentSectionTabs)[number];

export function tournamentTabFromLocation(
  pathname: string,
  requestedRound: number,
): TournamentTab {
  if (Number.isInteger(requestedRound) && requestedRound > 0) return "round";
  const section = pathname.split("/").filter(Boolean).at(2);
  return tournamentSectionTabs.includes(section as TournamentSectionTab)
    ? (section as TournamentSectionTab)
    : "overview";
}

export function tournamentTabHref(
  slug: string,
  tab: Exclude<TournamentTab, "round">,
): string {
  const basePath = `/tournaments/${encodeURIComponent(slug)}`;
  return tab === "overview" ? basePath : `${basePath}/${tab}`;
}

export function tournamentRoundHref(slug: string, roundNumber: number): string {
  return `${tournamentTabHref(slug, "overview")}?round=${roundNumber}`;
}
