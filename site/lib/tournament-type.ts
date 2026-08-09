export type TournamentType = "ordinary" | "seasonal" | "seasonal_cup";

export function isSeasonLeague(type: TournamentType): boolean {
  return type === "seasonal";
}

export function isSeasonalTournament(type: TournamentType): boolean {
  return type === "seasonal" || type === "seasonal_cup";
}

export function isTeamTournament(type: TournamentType): boolean {
  return !isSeasonLeague(type);
}
