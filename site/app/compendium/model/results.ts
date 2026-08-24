import type { CompendiumLeaderboardEntry } from "./leaderboard";
import type { StarRacePrize } from "./star-race";

export const finishedCompendiumCommunityOutcome = {
  finalsPrize: "12 000 ₽",
  leagueCupPrize: "7 500 ₽",
} as const;

export type PersonalCompendiumResult = {
  totalStars: number;
  dailyQuestStars: number;
  starRaceStars: number;
  predictionStars: number;
  tournamentParticipationStars: number;
  otherStars: number;
};

export type CompendiumRaceResult = {
  id: string;
  dateLabel: string;
  leaders: CompendiumLeaderboardEntry[];
  prizes: readonly StarRacePrize[];
};

export type CompendiumResultsData = {
  communityStars: number;
  leaders: CompendiumLeaderboardEntry[];
  personal: PersonalCompendiumResult | null;
  races: CompendiumRaceResult[];
};
