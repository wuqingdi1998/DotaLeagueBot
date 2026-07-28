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

export type SeasonSubstitution = {
  id: number;
  match_id: number;
  game_id: number | null;
  game_number: number | null;
  outgoing_player_id: string;
  outgoing_nickname: string;
  incoming_player_id: string;
  incoming_nickname: string;
  incoming_avatar_url: string | null;
  team_side: "a" | "b";
  technical_loss: boolean;
  note: string | null;
};

export type SeasonMatchParticipant = {
  player_id: string;
  nickname: string;
  avatar_url: string | null;
  team_side: "a" | "b";
  is_captain: boolean;
  tier_snapshot: number | null;
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
  substitutions: SeasonSubstitution[];
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
  round_kind: "regular" | "finals";
  lobby_count: number;
  played_match_count: number;
  lobbies: SeasonLobby[];
};

export type SeasonPlayer = {
  discord_id: string;
  nickname: string;
  avatar_url: string | null;
  standings_section: "active" | "inactive";
  inactive_reason: string | null;
};

export type SeasonPointAdjustment = {
  id: number;
  player_id: string;
  nickname: string;
  round_id: number | null;
  amount: number;
  reason: string;
};

export type SeasonPenaltyEvent = {
  id: number;
  player_id: string;
  nickname: string;
  round_id: number;
  round_number: number;
  fire_count: number;
  note: string | null;
};

export type SeasonFinalist = {
  player_id: string;
  nickname: string;
  avatar_url: string | null;
  seed: number | null;
  medal: "gold" | "silver" | null;
  note: string | null;
};

export type SeasonData = {
  generatedAt: string;
  rounds: SeasonRound[];
  standings: SeasonStanding[];
  previewStandings: SeasonStanding[] | null;
  participants: SeasonPlayer[];
  pointAdjustments: SeasonPointAdjustment[];
  penaltyEvents: SeasonPenaltyEvent[];
  finalists: SeasonFinalist[];
  isOrganizer: boolean;
};
