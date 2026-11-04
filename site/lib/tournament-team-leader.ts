import type { TournamentType } from "./tournament-type";

// Season 9 introduced managers; completed earlier cups keep their captain labels.
const firstManagerCupStart = Date.parse("2026-11-01T00:00:00+03:00");

export function usesLeagueCupManager(tournament: {
  tournament_type: TournamentType;
  start_at: string | Date;
}) {
  return tournament.tournament_type === "seasonal_cup"
    && new Date(tournament.start_at).getTime() >= firstManagerCupStart;
}
