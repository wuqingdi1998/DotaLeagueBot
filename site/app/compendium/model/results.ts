import type { CompendiumLeaderboardEntry } from "./leaderboard";
import { communityCompendiumRewards } from "./rewards";

export type CommunityCompendiumReward =
  (typeof communityCompendiumRewards)[number];

export type CommunityCompendiumResult = {
  unlocked: CommunityCompendiumReward[];
  next: CommunityCompendiumReward | null;
  starsToNext: number;
};

export type PersonalCompendiumResult = {
  totalStars: number;
  dailyQuestStars: number;
  starRaceStars: number;
  predictionStars: number;
  otherStars: number;
};

export type CompendiumRaceResult = {
  id: string;
  dateLabel: string;
  leaders: CompendiumLeaderboardEntry[];
};

export type CompendiumResultsData = {
  communityStars: number;
  community: CommunityCompendiumResult;
  leaders: CompendiumLeaderboardEntry[];
  personal: PersonalCompendiumResult | null;
  races: CompendiumRaceResult[];
};

export function communityResultForStars(
  totalStars: number,
): CommunityCompendiumResult {
  const unlocked = communityCompendiumRewards.filter(
    (reward) => reward.stars <= totalStars,
  );
  const next =
    communityCompendiumRewards.find((reward) => reward.stars > totalStars) ??
    null;
  return {
    unlocked: [...unlocked],
    next,
    starsToNext: next ? next.stars - totalStars : 0,
  };
}
