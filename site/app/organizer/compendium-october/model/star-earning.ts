import { QUEST_REWARD_STARS } from "@/app/compendium/model/constants";
import { dailyChallengeRewardStars } from "@/app/compendium/model/weekend-bonus";
import { fastCupOverviews } from "@/app/season/model/season-overview-model";
import type { SeasonTournamentLinkId } from "@/app/season/model/season-overview-model";
import { OCTOBER_COMPENDIUM_WEEKS } from "./plan";
import { OCTOBER_HERO_QUEST_COUNT } from "./preview";

export type OctoberStarEarningSource = {
  readonly id: "hero-quests" | "clan-outing" | "star-race" | "rune-challenge" | "league-rounds" | "fastcups";
  readonly title: string;
  readonly description: string;
  readonly rewardDetails?: readonly {
    readonly label: string;
    readonly stars: number;
  }[];
  readonly maxStars: number;
  readonly subscriberOnly?: boolean;
  readonly tournamentOnly?: boolean;
  readonly tournaments?: readonly {
    readonly linkId: SeasonTournamentLinkId;
    readonly label: string;
    readonly period: string;
    readonly fallbackHref: string | null;
  }[];
};

export const OCTOBER_FASTCUP_PLACE_REWARDS = [
  { place: 1, stars: 6 },
  { place: 2, stars: 4 },
  { place: 3, stars: 3 },
  { place: "other", stars: 1 },
] as const;

export const OCTOBER_LEAGUE_ROUND_NUMBERS = [6, 7, 8] as const;
const leagueRoundMaximumStars = 3;

const octoberFastcupLinkIds = new Set(["fastcup-14", "cd-fastcup-8"]);
const octoberFastcups = fastCupOverviews.filter(
  (fastcup) => octoberFastcupLinkIds.has(fastcup.linkId),
);

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
const dailyActivityStars = octoberDates.reduce(
  (total, dateKey) => total + dailyChallengeRewardStars(dateKey),
  0,
);
const firstPlaceFastcupStars = OCTOBER_FASTCUP_PLACE_REWARDS[0].stars;
const fastcupMaxStars = octoberFastcups.length * firstPlaceFastcupStars;
const leagueRoundMaxStars = OCTOBER_LEAGUE_ROUND_NUMBERS.length * leagueRoundMaximumStars;
const dailyBonusRewardDetails = [
  { label: `${standardRewardDays} обычных дней`, stars: QUEST_REWARD_STARS },
  {
    label: `${bonusRewardDays} дней с бонусом выходного дня`,
    stars: QUEST_REWARD_STARS * 2,
  },
] as const;
const starRaceRewardDetails = raceWeekStars.map((stars, index) => ({
  label: `${index + 1}-я неделя`,
  stars,
}));
const leagueRewardDetails = [
  { label: "Участие", stars: 1 },
  { label: "Одна выигранная карта", stars: 2 },
  { label: "Две выигранные карты", stars: leagueRoundMaximumStars },
] as const;
const fastcupRewardDetails = OCTOBER_FASTCUP_PLACE_REWARDS.map(({ place, stars }) => ({
  label: place === "other" ? "Остальные места" : `${place}-е место`,
  stars,
}));

export const OCTOBER_STAR_EARNING_SOURCES: readonly OctoberStarEarningSource[] = [
  {
    id: "hero-quests",
    title: "Испытания героев",
    description: "Каждый день доступны два испытания: победите на одном из предложенных героев. В пятницу, субботу и воскресенье награда удваивается.",
    rewardDetails: dailyBonusRewardDetails,
    maxStars: heroQuestStars,
  },
  {
    id: "clan-outing",
    title: "Клановая вылазка",
    description: "Одержите одну рейтинговую победу в группе с участником своего клана. В пятницу, субботу и воскресенье каждый получает две звезды вместо одной.",
    rewardDetails: dailyBonusRewardDetails,
    maxStars: dailyActivityStars,
  },
  {
    id: "rune-challenge",
    title: "Испытание Рун",
    description: "Выберите любимого героя и выполните его ежедневное испытание. В пятницу, субботу и воскресенье награда удваивается. Эти звёзды идут в личный и клановый зачёты, но не входят в недельную гонку.",
    rewardDetails: dailyBonusRewardDetails,
    maxStars: dailyActivityStars,
    subscriberOnly: true,
  },
  {
    id: "star-race",
    title: "Гонка за звёздами",
    description: "Выполняйте отдельное условие дня. Награда растёт от первой недели к финальной.",
    rewardDetails: starRaceRewardDetails,
    maxStars: starRaceStars,
  },
  {
    id: "league-rounds",
    title: "Туры сезонной лиги",
    description: "В период компендиума пройдут 6-й, 7-й и 8-й туры. Звёзды получает каждый сыгравший участник по результату своего матча.",
    rewardDetails: leagueRewardDetails,
    maxStars: leagueRoundMaxStars,
  },
  {
    id: "fastcups",
    title: "Fastcup #14 и CD Fastcup #8",
    description: `${octoberFastcups.map((fastcup) => fastcup.period).join(". ")}. Звёзды получает каждый игрок команды по итоговому месту.`,
    tournaments: octoberFastcups.map((fastcup) => ({
      linkId: fastcup.linkId,
      label: fastcup.title.replace("Linken’s Sphere ", ""),
      period: fastcup.period,
      fallbackHref: fastcup.tournamentHref,
    })),
    rewardDetails: fastcupRewardDetails,
    maxStars: fastcupMaxStars,
    tournamentOnly: true,
  },
] as const;

export const OCTOBER_STANDARD_MAX_STARS = OCTOBER_STAR_EARNING_SOURCES
  .filter((source) => !source.subscriberOnly && !source.tournamentOnly)
  .reduce((total, source) => total + source.maxStars, 0);

export const OCTOBER_SUBSCRIBER_MAX_STARS = OCTOBER_STAR_EARNING_SOURCES
  .filter((source) => !source.tournamentOnly)
  .reduce((total, source) => total + source.maxStars, 0);

export const OCTOBER_ABSOLUTE_MAX_STARS = OCTOBER_STAR_EARNING_SOURCES
  .reduce((total, source) => total + source.maxStars, 0);
