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

export type CompendiumData = {
  moscowDate: string;
  moscowDateLabel: string;
  nextResetAt: string;
  tournamentStartsAt: string;
  totalStars: number;
  hasDotaId: boolean;
  quests: DailyQuest[];
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
};

export type MatchingWin = {
  heroId: number;
  matchId: string;
  endedAt: Date;
};
