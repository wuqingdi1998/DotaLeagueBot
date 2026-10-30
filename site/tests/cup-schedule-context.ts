import { emptyTournament } from "@/app/tournaments/hub/tournament-hub-model";
import type { Tournament } from "@/app/tournaments/[slug]/model/types";

export const cupTournament: Tournament = {
  ...emptyTournament, id: 52, tournament_type: "seasonal_cup", season_round_count: 0,
  slug: "league-cup-season-9", name: "Кубок лиги", headline: "Кубок лиги",
  start_at: "2026-11-01T21:00:00Z", end_at: "2026-12-13T20:59:00Z",
  playoff_starts_on: "2026-11-30", first_match_at: "2026-11-07T18:00:00Z",
  registration_starts_at: null, registration_deadline: "2026-03-28T21:00:00Z",
  ordinary_match_rooms_enabled: false, close_event_id: null, close_message_id: null,
  close_series: null, season_activity_points_note: null, updated_at: "2026-10-30T00:00:00Z",
};

export function useTournament() {
  return { activeTab: "overview", checkInWindow: null,
    data: { tournament: cupTournament, scheduleDays: [], prizes: [] } };
}
