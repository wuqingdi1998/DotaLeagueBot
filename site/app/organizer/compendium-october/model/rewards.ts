import type { RewardMilestone } from "@/app/compendium/model/rewards";
import { OCTOBER_REWARD_STARS } from "@/lib/october-reward-thresholds";

const mainRewards: readonly RewardMilestone[] = [
  {
    stars: OCTOBER_REWARD_STARS.bronzeBadge,
    title: "Бронзовый бейдж клана",
    description: "Символ вашего клана навсегда появится в профиле.",
    badgeKeys: ["october-2026-morbus-bronze", "october-2026-panacea-bronze"],
  },
  {
    stars: OCTOBER_REWARD_STARS.firstReroll,
    title: "Ещё одна замена в день",
    description: "Ежедневный запас замен заданий увеличится с одной до двух.",
  },
  {
    stars: OCTOBER_REWARD_STARS.silverBadge,
    title: "Серебряный бейдж клана",
    description: "Бронзовый знак в профиле сменится серебряным.",
    badgeKeys: ["october-2026-morbus-silver", "october-2026-panacea-silver"],
  },
  {
    stars: OCTOBER_REWARD_STARS.secondReroll,
    title: "Ещё одна замена в день",
    description: "Ежедневный запас замен заданий увеличится с двух до трёх.",
  },
  {
    stars: OCTOBER_REWARD_STARS.goldBadge,
    title: "Золотой бейдж клана",
    description: "Золотой знак вашего клана навсегда останется в профиле.",
    badgeKeys: ["october-2026-morbus-gold", "october-2026-panacea-gold"],
  },
];

const secretReward: RewardMilestone = {
  stars: OCTOBER_REWARD_STARS.platinumBadge,
  title: "Платиновый бейдж клана",
  description: "Скрытая цель откроется после 60 звёзд. Платиновый знак останется в профиле.",
  badgeKeys: ["october-2026-morbus-platinum", "october-2026-panacea-platinum"],
};

export function octoberRewardsForStars(stars: number): readonly RewardMilestone[] {
  return stars >= OCTOBER_REWARD_STARS.goldBadge ? [...mainRewards, secretReward] : mainRewards;
}

export function octoberDailyRerollAllowance(stars: number): number {
  return 1 + Number(stars >= OCTOBER_REWARD_STARS.firstReroll)
    + Number(stars >= OCTOBER_REWARD_STARS.secondReroll);
}
