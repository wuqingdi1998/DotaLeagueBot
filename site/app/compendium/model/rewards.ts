import {
  DAILY_REROLL_COUNT,
  REROLL_REWARD_STAR_THRESHOLD,
  REWARDED_DAILY_REROLL_COUNT,
} from "./constants";

export const personalCompendiumRewards = [
  {
    stars: 10,
    title: "Бронзовый бейдж TI 2026",
    description: "Бронзовый бейдж The International 2026 в профиле на сайте.",
  },
  {
    stars: 25,
    title: "Три реролла в день",
    description: "Ежедневный запас увеличивается с одного до трёх рероллов. При достижении порога три реролла выдаются сразу, даже если прежний уже потрачен.",
  },
  {
    stars: 40,
    title: "Серебряный бейдж TI 2026",
    description: "Серебряный бейдж The International 2026 в профиле на сайте.",
  },
  {
    stars: 55,
    title: "Бонусное испытание",
    description: "Четвёртое ежедневное испытание с шестью героями и наградой в одну звезду.",
  },
  {
    stars: 75,
    title: "Золотой бейдж и роль",
    description: "Золотой бейдж TI 2026 и уникальная роль над остальными ролями на сервере до старта 9-го сезона.",
  },
] as const;

export const communityCompendiumRewards = [
  {
    stars: 200,
    title: "Linken's Sphere 5x5 League остаётся бесплатной",
    description: "Лига не будет требовать подписки, все сезонные турниры остаются бесплатными. Будущие финалы 9-го сезона — 5 000 ₽, Кубок лиги — 3 000 ₽.",
  },
  {
    stars: 400,
    title: "Призовые 7 500 ₽ / 5 000 ₽",
    description: "Финалы лиги — 7 500 ₽, Кубок лиги — 5 000 ₽.",
  },
  {
    stars: 600,
    title: "Призовые 10 000 ₽ / 6 000 ₽",
    description: "Финалы лиги — 10 000 ₽, Кубок лиги — 6 000 ₽.",
  },
  {
    stars: 800,
    title: "Призовые 12 000 ₽ / 7 500 ₽",
    description: "Финалы лиги — 12 000 ₽, Кубок лиги — 7 500 ₽.",
  },
  {
    stars: 1000,
    title: "Призовые 15 000 ₽ / 9 000 ₽",
    description: "Финалы лиги — 15 000 ₽, Кубок лиги — 9 000 ₽.",
  },
  {
    stars: 1500,
    title: "Гайд на Winter Wyvern",
    description: "Гайд на Winter Wyvern от cYc.Lon3.",
  },
] as const;

export type CompendiumBadgeTier = "bronze" | "silver" | "gold";

export function compendiumBadgeForStars(
  stars: number,
): CompendiumBadgeTier | null {
  if (stars >= 75) return "gold";
  if (stars >= 40) return "silver";
  if (stars >= 10) return "bronze";
  return null;
}

export function dailyRerollsRemainingForProgress(input: {
  totalStars: number;
  usedCount: number;
  thresholdReachedToday: boolean;
  usedBeforeThreshold: number;
}): number {
  const isUnlocked = input.totalStars >= REROLL_REWARD_STAR_THRESHOLD;
  const allowance = isUnlocked
    ? REWARDED_DAILY_REROLL_COUNT +
      (input.thresholdReachedToday ? input.usedBeforeThreshold : 0)
    : DAILY_REROLL_COUNT;
  return Math.max(0, allowance - input.usedCount);
}
