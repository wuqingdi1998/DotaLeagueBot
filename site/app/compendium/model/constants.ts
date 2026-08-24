export const COMPENDIUM_TIME_ZONE = "Europe/Moscow";
export const COMPENDIUM_TOURNAMENT_START_AT = "2026-08-13T07:00:00+03:00";
export const COMPENDIUM_END_AT = "2026-08-24T00:00:00+03:00";
export const COMPENDIUM_FINAL_DATE = "2026-08-23";
export const COMPENDIUM_PLAYOFF_STAGES = [
  { dateKey: "2026-08-20", label: "1-й день плей-офф" },
  { dateKey: "2026-08-21", label: "2-й день плей-офф" },
  { dateKey: "2026-08-22", label: "Предфинальный день плей-офф" },
  { dateKey: "2026-08-23", label: "Финальный день плей-офф" },
] as const;
export const DAILY_QUEST_COUNT = 3;
export const HEROES_PER_QUEST = 6;
export const DAILY_HERO_COUNT = DAILY_QUEST_COUNT * HEROES_PER_QUEST;
export const BONUS_QUEST_POSITION = 4;
export const BONUS_QUEST_HERO_COUNT = 6;
export const BONUS_QUEST_STAR_THRESHOLD = 40;
export const QUEST_REWARD_STARS = 1;
export const DAILY_REROLL_COUNT = 1;
export const REWARDED_DAILY_REROLL_COUNT = 3;
export const REROLL_REWARD_STAR_THRESHOLD = 20;
export const OPEN_DOTA_CACHE_TTL_MS = 45_000;
export const CHECK_RATE_WINDOW_SECONDS = 60;
export const CHECK_RATE_LIMIT = 8;
export const RANKED_LOBBY_TYPES = new Set([5, 6, 7]);
export const RANKED_GAME_MODES = new Set([1, 2, 3, 4, 16, 22]);
export const MATCHMADE_LOBBY_TYPES = new Set([0, 5, 6, 7, 8, 9]);

export const NO_MATCH_MESSAGE =
  "Подходящий матч пока не найден. Убедитесь, что вы победили в рейтинговом матче на одном из указанных героев, и попробуйте позже.";
export const OPEN_DOTA_ERROR_MESSAGE =
  "Не удалось получить данные матчей из OpenDota. Попробуйте повторить проверку позже.";
export const STALE_QUEST_MESSAGE =
  "День уже сменился. Загружаем новые задания.";
