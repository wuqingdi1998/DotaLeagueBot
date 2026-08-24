import type { SeasonStandingSnapshot } from "@/lib/season";

export type RoundRow = {
  id: number;
  tournament_id: number;
  round_number: number;
  name: string | null;
  status: "planned" | "active" | "completed" | "cancelled";
  scheduled_at: string | null;
  is_visible: boolean;
  round_kind: "regular" | "finals";
  lobby_count: number;
  played_match_count: number;
  registration_count: number;
  is_registered: boolean;
  is_checked_in: boolean;
  lobby_configuration_status: "none" | "editing" | "locked" | "published";
};

export type LobbyRow = {
  id: number;
  round_id: number;
  name: string;
  sort_order: number;
  status: "draft" | "scheduled" | "live" | "completed" | "cancelled";
  scheduled_at: string | null;
};

export type MatchRow = {
  id: number;
  lobby_id: number;
  round_id: number;
  round_number: number;
  lobby_name: string;
  scheduled_at: string | null;
  team_a_name: string;
  team_b_name: string;
  best_of: number;
  team_a_score: number | null;
  team_b_score: number | null;
  result: "team_a" | "draw" | "team_b" | null;
  status: "draft" | "published" | "completed" | "cancelled";
  sort_order: number;
};

export type ParticipantRow = {
  match_id: number;
  player_id: string;
  dota_id: string;
  nickname: string;
  avatar_url: string | null;
  positions: string | null;
  team_side: "a" | "b";
  is_captain: boolean;
  tier_snapshot: number | null;
  slot_number: number | null;
};

export type GameRow = {
  id: number;
  match_id: number;
  game_number: number;
  dota_match_id: string | null;
  winner_side: "a" | "draw" | "b" | null;
  duration_seconds: number | null;
  status: "draft" | "published" | "completed" | "cancelled";
};

export type SeasonPlayerRow = {
  discord_id: string;
  dota_id: string;
  nickname: string;
  avatar_url: string | null;
  standings_section: "active" | "inactive";
  inactive_reason: string | null;
  rank_snapshot: number | null;
  standings_snapshot: SeasonStandingSnapshot | null;
};

export type RoundRegistrationRow = {
  round_id: number;
  player_id: string;
  dota_id: string;
  nickname: string;
  avatar_url: string | null;
  positions: string | null;
  tier_snapshot: number | null;
  created_at: string;
  is_checked_in: boolean;
};
