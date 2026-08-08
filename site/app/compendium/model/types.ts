export type CompendiumHero = {
  id: number;
  key: string;
  name: string;
  imageUrl: string;
};

export type QuestCompletion = {
  matchedHeroId: number;
  matchedMatchId: string;
  completedAt: string;
};

export type DailyQuest = {
  id: string;
  position: number;
  heroes: CompendiumHero[];
  completion: QuestCompletion | null;
};

export type RuneChallengeSelection = {
  hero: CompendiumHero;
  selectedAt: string;
  nextChangeAt: string;
  canChangeHero: boolean;
};

export type RuneChallengeData = {
  hasAccess: boolean;
  accessRoleName: string | null;
  selection: RuneChallengeSelection | null;
  completion: QuestCompletion | null;
};

export type PredictionTeam = {
  key: string;
  name: string;
  logoUrl: string;
};

export type DailyPredictionMatch = {
  id: string;
  position: number;
  startsAt: string;
  teamA: PredictionTeam;
  teamB: PredictionTeam;
  predictedScore: import("./predictions").PredictionScore | null;
  actualScore: import("./predictions").PredictionScore | null;
  rewardStars: number | null;
  isLocked: boolean;
};

export type CompendiumData = {
  moscowDate: string;
  moscowDateLabel: string;
  nextResetAt: string;
  tournamentStartsAt: string;
  dailyChallengeRewardStars: import("./weekend-bonus").DailyChallengeRewardStars;
  rerollsRemaining: number;
  totalStars: number;
  communityStars: number;
  starRace: import("./star-race").StarRaceData;
  hasDotaId: boolean;
  quests: DailyQuest[];
  runeChallenge: RuneChallengeData;
  predictions: DailyPredictionMatch[];
};

export type OpenDotaMatch = {
  match_id: number | string;
  player_slot: number;
  radiant_win: boolean;
  duration: number;
  game_mode: number;
  lobby_type: number;
  hero_id: number;
  start_time: number;
  tower_damage?: number | null;
  hero_damage?: number | null;
  kills?: number | null;
};

export type MatchingWin = {
  heroId: number;
  matchId: string;
  endedAt: Date;
};
