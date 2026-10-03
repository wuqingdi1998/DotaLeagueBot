export const OCTOBER_LEAGUE_ROUND_NUMBERS = [6, 7, 8] as const;

export const OCTOBER_LEAGUE_REWARD_STARS = {
  participation: 1,
  oneMapWin: 3,
  twoMapWins: 6,
} as const;

export const OCTOBER_LEAGUE_REWARD_DETAILS = [
  { label: "Участие", stars: OCTOBER_LEAGUE_REWARD_STARS.participation },
  { label: "Одна выигранная карта", stars: OCTOBER_LEAGUE_REWARD_STARS.oneMapWin },
  { label: "Две выигранные карты", stars: OCTOBER_LEAGUE_REWARD_STARS.twoMapWins },
] as const;

export const OCTOBER_LEAGUE_ROUND_MAXIMUM_STARS = (
  OCTOBER_LEAGUE_REWARD_STARS.twoMapWins
);
