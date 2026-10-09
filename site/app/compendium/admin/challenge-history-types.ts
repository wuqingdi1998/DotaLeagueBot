import type { CompendiumHero } from "../model/types";

export type HistoricalChallengeKind = "daily" | "rune" | "clan_outing" | "star_race";
export type HistoricalChallenge = {
  kind: HistoricalChallengeKind;
  id: string;
  title: string;
  description: string;
  rewardStars: number;
  heroes: CompendiumHero[];
  isCompleted: boolean;
  isManual: boolean;
  unavailableReason: string | null;
};
export type HistoricalChallenges = {
  dateKey: string;
  dates: Array<{ dateKey: string; label: string }>;
  challenges: HistoricalChallenge[];
  clanMates: Array<{ playerId: string; playerName: string }>;
};
export type HistoricalCompletionInput = {
  playerId: string;
  dateKey: string;
  kind: HistoricalChallengeKind;
  questId?: string;
  matchIds: string[];
  heroId?: number;
  partnerPlayerId?: string;
  administratorId: string | null;
  now?: Date;
};
