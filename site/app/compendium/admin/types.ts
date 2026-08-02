import type { CompendiumHero } from "../model/types";

export type CompendiumAdminSourceRow = {
  player_id: string;
  player_name: string;
  dota_id: string;
  avatar_url: string | null;
  total_stars: number;
  history_kind: "quest" | "admin" | "prediction" | null;
  completion_id: string | null;
  moscow_date: string | null;
  quest_position: number | null;
  matched_hero_id: number | null;
  matched_match_id: string | null;
  completed_at: Date | null;
  reward_amount: number | null;
  quest_hero_id: number | null;
  hero_position: number | null;
  administrator_name: string | null;
  team_a_name: string | null;
  team_b_name: string | null;
  predicted_score: string | null;
  actual_score: string | null;
};

export type CompendiumQuestRewardHistory = {
  kind: "quest";
  id: string;
  dateKey: string;
  dateLabel: string;
  questPosition: number;
  matchedHeroId: number;
  matchedMatchId: string;
  completedAt: string;
  rewardAmount: number;
  heroes: CompendiumHero[];
};

export type CompendiumAdminRewardHistory = {
  kind: "admin";
  id: string;
  dateKey: string;
  dateLabel: string;
  completedAt: string;
  rewardAmount: number;
  administratorName: string;
};

export type CompendiumPredictionRewardHistory = {
  kind: "prediction";
  id: string;
  dateKey: string;
  dateLabel: string;
  completedAt: string;
  rewardAmount: number;
  teamAName: string;
  teamBName: string;
  predictedScore: string;
  actualScore: string;
};

export type CompendiumRewardHistory =
  | CompendiumQuestRewardHistory
  | CompendiumAdminRewardHistory
  | CompendiumPredictionRewardHistory;

export type CompendiumAdminParticipant = {
  discordId: string;
  dotaId: string;
  playerName: string;
  avatarUrl: string | null;
  totalStars: number;
  rewards: CompendiumRewardHistory[];
};
