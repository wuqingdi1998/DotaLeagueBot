import type { CompendiumHero } from "../model/types";

export type CompendiumAdminSourceRow = {
  player_id: string;
  player_name: string;
  dota_id: string;
  avatar_url: string | null;
  total_stars: number;
  completion_id: string | null;
  moscow_date: string | null;
  quest_position: number | null;
  matched_hero_id: number | null;
  matched_match_id: string | null;
  completed_at: Date | null;
  reward_amount: number | null;
  quest_hero_id: number | null;
  hero_position: number | null;
};

export type CompendiumRewardHistory = {
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

export type CompendiumAdminParticipant = {
  discordId: string;
  dotaId: string;
  playerName: string;
  avatarUrl: string | null;
  totalStars: number;
  rewards: CompendiumRewardHistory[];
};
