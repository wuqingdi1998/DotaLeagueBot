import { QUEST_REWARD_STARS } from "@/app/compendium/model/constants";
import { dailyChallengeRewardStars } from "@/app/compendium/model/weekend-bonus";
import { OCTOBER_COMPENDIUM_WEEKS } from "./plan";
import { OCTOBER_HERO_QUEST_COUNT } from "./preview";

export type OctoberStarEarningSource = {
  readonly id: "hero-quests" | "clan-outing" | "star-race" | "rune-challenge";
  readonly title: string;
  readonly description: string;
  readonly calculation: string;
  readonly maxStars: number;
  readonly subscriberOnly?: boolean;
};

const octoberDates = OCTOBER_COMPENDIUM_WEEKS.flatMap((week) => (
  week.quests.map((quest) => quest.dateKey)
));
const standardRewardDays = octoberDates.filter(
  (dateKey) => dailyChallengeRewardStars(dateKey) === 1,
).length;
const bonusRewardDays = octoberDates.length - standardRewardDays;
const heroQuestStars = octoberDates.reduce(
  (total, dateKey) => total + OCTOBER_HERO_QUEST_COUNT * dailyChallengeRewardStars(dateKey),
  0,
);
const raceWeekStars = OCTOBER_COMPENDIUM_WEEKS.map((week) => (
  week.quests.reduce((total, quest) => total + quest.rewardStars, 0)
));
const starRaceStars = raceWeekStars.reduce((total, stars) => total + stars, 0);
const dailyActivityStars = octoberDates.length * QUEST_REWARD_STARS;

export const OCTOBER_STAR_EARNING_SOURCES: readonly OctoberStarEarningSource[] = [
  {
    id: "hero-quests",
    title: "Испытания героев",
    description: "Каждый день доступны два испытания: победите на одном из предложенных героев. В пятницу, субботу и воскресенье награда удваивается.",
    calculation: `${standardRewardDays} дней × ${OCTOBER_HERO_QUEST_COUNT} × 1 + ${bonusRewardDays} дней × ${OCTOBER_HERO_QUEST_COUNT} × 2`,
    maxStars: heroQuestStars,
  },
  {
    id: "clan-outing",
    title: "Клановый поход",
    description: "Одержите одну рейтинговую победу в группе с участником своего клана. Задание обновляется каждый день.",
    calculation: `${octoberDates.length} день × ${QUEST_REWARD_STARS}`,
    maxStars: dailyActivityStars,
  },
  {
    id: "star-race",
    title: "Гонка за звёздами",
    description: "Выполняйте отдельное условие дня. Награда растёт от первой недели к финальной.",
    calculation: `${raceWeekStars.join(" + ")} по неделям`,
    maxStars: starRaceStars,
  },
  {
    id: "rune-challenge",
    title: "Испытание Рун",
    description: "Для подписчиков: выберите любимого героя и выполните его ежедневное испытание. Эти звёзды идут в личный и клановый зачёты, но не входят в недельную гонку.",
    calculation: `${octoberDates.length} день × ${QUEST_REWARD_STARS}`,
    maxStars: dailyActivityStars,
    subscriberOnly: true,
  },
] as const;

export const OCTOBER_STANDARD_MAX_STARS = OCTOBER_STAR_EARNING_SOURCES
  .filter((source) => !source.subscriberOnly)
  .reduce((total, source) => total + source.maxStars, 0);

export const OCTOBER_SUBSCRIBER_MAX_STARS = OCTOBER_STAR_EARNING_SOURCES
  .reduce((total, source) => total + source.maxStars, 0);
