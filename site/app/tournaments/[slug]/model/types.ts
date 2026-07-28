export type PlayerRole =
  | "safe_lane"
  | "mid_lane"
  | "off_lane"
  | "soft_support"
  | "hard_support";

export type Tournament = {
  id: number;
  tournament_type: "ordinary" | "seasonal";
  season_round_count: number;
  slug: string;
  name: string;
  eyebrow: string;
  headline: string;
  headline_accent: string;
  description: string;
  about: string;
  start_at: string;
  end_at: string;
  registration_deadline: string;
  status_label: string;
  format: string;
  team_size: number;
  max_teams: number;
  region: string;
  server: string;
  check_in_minutes: number;
  group_format: string;
  playoff_format: string;
  final_format: string;
  playoff_type: "single_elimination" | "double_elimination";
  discord_url: string;
  status: "draft" | "registration" | "active" | "finished" | "archived";
  updated_at: string;
};

export type TeamApplication = {
  id: number;
  tournament_id: number;
  team_name: string;
  tag: string;
  captain: string;
  contact: string;
  player_2: string;
  player_3: string;
  player_4: string;
  player_5: string;
  captain_role: PlayerRole;
  player_2_role: PlayerRole;
  player_3_role: PlayerRole;
  player_4_role: PlayerRole;
  player_5_role: PlayerRole;
  logo_key: string | null;
  selection_method: string;
  team_tier_total_snapshot: number | null;
  placement: number | null;
  result_label: string | null;
  status: "approved" | "pending" | "awaiting_members" | "declined" | "withdrawn";
  created_at: string;
  members: Array<{
    discord_id: string | null;
    dota_id: string | null;
    name: string;
    role: PlayerRole;
    is_captain: boolean;
    invitation_status: "invited" | "accepted" | "declined";
    tier_snapshot: number | null;
  }>;
};

export type TournamentMatch = {
  id: number;
  tournament_id: number;
  group_id: number | null;
  scheduled_at: string;
  stage: string;
  team_a: string;
  team_b: string;
  team_a_application_id: number | null;
  team_b_application_id: number | null;
  team_a_placeholder: string | null;
  team_b_placeholder: string | null;
  team_a_score: number | null;
  team_b_score: number | null;
  result_type: "normal" | "technical" | "forfeit" | "cancelled";
  team_a_result_label: string | null;
  team_b_result_label: string | null;
  decision_note: string | null;
  bracket_round: number | null;
  bracket_side: "group" | "upper" | "lower" | "grand_final" | null;
  bracket_slot: number | null;
  bracket_grid_column: number | null;
  bracket_grid_row: number | null;
  eliminated_team_application_id: number | null;
  winner_to_match_id: number | null;
  winner_to_slot: "a" | "b" | null;
  loser_to_match_id: number | null;
  loser_to_slot: "a" | "b" | null;
  best_of: number;
  sort_order: number;
  status: "scheduled" | "ready" | "live" | "finished" | "cancelled";
  team_a_checked_in: boolean;
  team_b_checked_in: boolean;
};

export type Standing = {
  id: number;
  tournament_id: number;
  group_id: number;
  application_id: number;
  group_name: string;
  place: number;
  team_name: string;
  games: number;
  maps_won: number;
};

export type TournamentGroup = {
  id: number;
  tournament_id: number;
  name: string;
  sort_order: number;
  explanation: string | null;
  team_capacity: number;
  advance_to_playoff: number;
  advance_to_upper: number;
  advance_to_lower: number;
};

export type TournamentScheduleDay = {
  id: number;
  tournament_id: number;
  day_date: string;
  title: string | null;
  sort_order: number;
  entries: Array<{
    id: number;
    day_id: number;
    start_time: string;
    stage_name: string;
    match_count: number;
    series_format: string;
    sort_order: number;
  }>;
};

export type TournamentSiteData = {
  tournament: Tournament;
  applications: TeamApplication[];
  matches: TournamentMatch[];
  standings: Standing[];
  groups: TournamentGroup[];
  rules: Array<{
    id: number;
    tournament_id: number;
    sort_order: number;
    rule_text: string;
  }>;
  prizes: Array<{
    id: number;
    tournament_id: number;
    placement: number;
    application_id: number | null;
    team_name: string | null;
    prize_text: string | null;
  }>;
  scheduleDays: TournamentScheduleDay[];
  user: {
    discordId: string;
    dotaId: string;
    username: string;
    avatarUrl: string | null;
    playerName: string;
    realName: string | null;
    positions: string | null;
    serverName: string;
    isAdmin: boolean;
  } | null;
  invitations: Array<{
    application_id: number;
    team_name: string;
    tag: string;
    role: PlayerRole;
    invitation_status: "invited";
  }>;
};

export type MatchDraft = {
  groupId: string;
  scheduledAt: string;
  stage: string;
  teamAId: string;
  teamBId: string;
  teamAPlaceholder: string;
  teamBPlaceholder: string;
  bestOf: string;
  bracketSide: string;
  bracketRound: string;
  bracketSlot: string;
};

export type RegistrationForm = {
  team_name: string;
  tag: string;
  captain: string;
  contact: string;
  player_2: string;
  player_3: string;
  player_4: string;
  player_5: string;
  captain_role: PlayerRole;
  player_2_role: PlayerRole;
  player_3_role: PlayerRole;
  player_4_role: PlayerRole;
  player_5_role: PlayerRole;
  rulesAccepted: boolean;
};

export type TournamentTab =
  | "overview"
  | "standings"
  | "round"
  | "teams"
  | "matches"
  | "groups"
  | "playoffs"
  | "rules"
  | "admin";
