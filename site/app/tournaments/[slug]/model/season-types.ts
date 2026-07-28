import type { SeasonStanding } from "@/lib/season";

export type SeasonRoundStatus =
  | "planned"
  | "active"
  | "completed"
  | "cancelled";

export type SeasonMatchStatus =
  | "draft"
  | "published"
  | "completed"
  | "cancelled";

export type SeasonGame = {
  id: number;
  match_id: number;
  game_number: number;
  dota_match_id: string | null;
  winner_side: "a" | "draw" | "b" | null;
  duration_seconds: number | null;
  status: SeasonMatchStatus;
};

export type SeasonMatchParticipant = {
  player_id: string;
  nickname: string;
  avatar_url: string | null;
  team_side: "a" | "b";
  is_captain: boolean;
};

export type SeasonMatch = {
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
  status: SeasonMatchStatus;
  sort_order: number;
  participants: SeasonMatchParticipant[];
  games: SeasonGame[];
};

export type SeasonLobby = {
  id: number;
  round_id: number;
  name: string;
  sort_order: number;
  status: "draft" | "scheduled" | "live" | "completed" | "cancelled";
  scheduled_at: string | null;
  matches: SeasonMatch[];
};

export type SeasonRound = {
  id: number;
  tournament_id: number;
  round_number: number;
  name: string | null;
  status: SeasonRoundStatus;
  scheduled_at: string | null;
  is_visible: boolean;
  lobby_count: number;
  played_match_count: number;
  lobbies: SeasonLobby[];
};

export type SeasonPlayer = {
  discord_id: string;
  nickname: string;
  avatar_url: string | null;
};

export type SeasonData = {
  generatedAt: string;
  rounds: SeasonRound[];
  standings: SeasonStanding[];
  previewStandings: SeasonStanding[] | null;
  participants: SeasonPlayer[];
  isOrganizer: boolean;
};
