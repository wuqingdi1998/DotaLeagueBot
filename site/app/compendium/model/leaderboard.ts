export type CompendiumLeaderboardEntry = {
  rank: number;
  playerId: string;
  dotaId: string;
  playerName: string;
  avatarUrl: string | null;
  totalStars: number;
  completedQuests?: number;
};
