import type { CompendiumHero } from "../model/types";
import type { CompendiumLeaderboardEntry } from "../model/leaderboard";
import type {
  StarRacePhase,
  StarRacePrize,
  StarRaceQuestDefinition,
} from "../model/star-race";

export type CompendiumStarRaceArchive = {
  id: string;
  title: string;
  dateLabel: string;
  startsAt: string;
  endsAt: string;
  phase: StarRacePhase;
  prizes: readonly StarRacePrize[];
  quests: readonly StarRaceQuestDefinition[];
  participants: CompendiumLeaderboardEntry[];
};

export type CompendiumAdminSourceRow = {
  player_id: string;
  player_name: string;
  dota_id: string;
  avatar_url: string | null;
  total_stars: number;
  history_kind:
    | "quest"
    | "admin"
    | "prediction"
    | "rune"
    | "star_race"
    | null;
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

export type CompendiumAdminParticipantSummaryRow = {
  player_id: string;
  player_name: string;
  dota_id: string;
  avatar_url: string | null;
  total_stars: number;
  reward_count: number;
};

export type CompendiumAdminCurrentQuestSourceRow = {
  player_id: string;
  quest_id: string;
  quest_position: number;
  hero_id: number;
  hero_position: number;
  reward_stars: number;
  is_completed: boolean;
  is_manual: boolean;
};

export type CompendiumAdminCurrentQuest = {
  id: string;
  position: number;
  rewardStars: number;
  isCompleted: boolean;
  isManual: boolean;
  heroes: CompendiumHero[];
};

export type CompendiumAdminCurrentStarRaceCompletionRow = {
  player_id: string;
  moscow_date: string;
  is_manual: boolean;
};

export type CompendiumAdminCurrentStarRaceQuest = {
  dateKey: string;
  title: string;
  description: string;
  rewardStars: number;
  isCompleted: boolean;
  isManual: boolean;
  heroes: CompendiumHero[];
};

export type CompendiumQuestRewardHistory = {
  kind: "quest";
  id: string;
  dateKey: string;
  dateLabel: string;
  questPosition: number;
  matchedHeroId: number | null;
  matchedMatchId: string | null;
  completedAt: string;
  rewardAmount: number;
  isManual: boolean;
  administratorName: string | null;
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

export type CompendiumRuneRewardHistory = {
  kind: "rune";
  id: string;
  dateKey: string;
  dateLabel: string;
  completedAt: string;
  rewardAmount: number;
  hero: CompendiumHero;
  matchedMatchId: string;
};

export type CompendiumStarRaceRewardHistory = {
  kind: "star_race";
  id: string;
  dateKey: string;
  dateLabel: string;
  completedAt: string;
  rewardAmount: number;
  isManual: boolean;
  administratorName: string | null;
  wins: Array<{
    hero: CompendiumHero;
    matchedMatchId: string;
  }>;
};

export type CompendiumRewardHistory =
  | CompendiumQuestRewardHistory
  | CompendiumAdminRewardHistory
  | CompendiumPredictionRewardHistory
  | CompendiumRuneRewardHistory
  | CompendiumStarRaceRewardHistory;

export type CompendiumAdminParticipant = {
  discordId: string;
  dotaId: string;
  playerName: string;
  avatarUrl: string | null;
  totalStars: number;
  currentQuests: CompendiumAdminCurrentQuest[];
  currentStarRaceQuests: CompendiumAdminCurrentStarRaceQuest[];
  rewards: CompendiumRewardHistory[];
};

export type CompendiumAdminParticipantSummary = Omit<
  CompendiumAdminParticipant,
  "rewards"
> & {
  rewardCount: number;
};
