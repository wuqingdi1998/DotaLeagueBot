export type DailyChallengeRewardStars = 1 | 2;

const STANDARD_REWARD_STARS: DailyChallengeRewardStars = 1;
const WEEKEND_REWARD_STARS: DailyChallengeRewardStars = 2;
const WEEKEND_DAYS = new Set([0, 5, 6]);

function weekdayForDateKey(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isWeekendBonusDate(dateKey: string): boolean {
  return WEEKEND_DAYS.has(weekdayForDateKey(dateKey));
}

export function dailyChallengeRewardStars(
  dateKey: string,
): DailyChallengeRewardStars {
  return isWeekendBonusDate(dateKey)
    ? WEEKEND_REWARD_STARS
    : STANDARD_REWARD_STARS;
}

export function dailyQuestRewardStars(
  dateKey: string,
  questPosition: number,
): DailyChallengeRewardStars {
  return questPosition <= 3
    ? dailyChallengeRewardStars(dateKey)
    : STANDARD_REWARD_STARS;
}
