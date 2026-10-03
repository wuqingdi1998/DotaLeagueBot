import type { StarRaceWeekDefinition } from "@/app/compendium/model/star-race";
import {
  OCTOBER_FIRST_RACE_QUESTS,
  OCTOBER_SECOND_RACE_QUESTS,
  OCTOBER_THIRD_RACE_QUESTS,
  type OctoberRaceQuestDefinition,
} from "./race-quests";
export {
  OCTOBER_COMPENDIUM_DATE_LABEL,
  OCTOBER_COMPENDIUM_END_AT,
  OCTOBER_COMPENDIUM_START_AT,
} from "@/lib/october-compendium-schedule";
import {
  OCTOBER_COMPENDIUM_END_AT,
  OCTOBER_COMPENDIUM_START_AT,
} from "@/lib/october-compendium-schedule";

export type OctoberCompendiumWeekDefinition = Omit<StarRaceWeekDefinition, "quests"> & {
  readonly quests: readonly OctoberRaceQuestDefinition[];
};

const unannouncedPrizes = [
  { place: 1, title: "Предмет выберем позже", imageUrl: null },
  { place: 2, title: "Предмет выберем позже", imageUrl: null },
] as const;

const dotaPlusRacePrizes = [
  {
    place: 1,
    title: "1 месяц Dota+ + 1 месяц подарочной подписки на любую цветную руну Boosty",
    imageUrl: "/compendium/october/dota-plus-one-month.png",
  },
  {
    place: 2,
    title: "The Igneous Stone",
    imageUrl: "/compendium/october/the-igneous-stone.png",
  },
] as const;

export const OCTOBER_COMPENDIUM_WEEKS: readonly OctoberCompendiumWeekDefinition[] = [
  {
    id: "2026-10-05",
    title: "Гонка за звёздами · Разгон",
    dateLabel: "5–11 октября 2026",
    startsAt: OCTOBER_COMPENDIUM_START_AT,
    endsAt: "2026-10-12T00:00:00+03:00",
    prizes: dotaPlusRacePrizes,
    quests: OCTOBER_FIRST_RACE_QUESTS,
  },
  {
    id: "2026-10-12",
    title: "Гонка за звёздами · Темп",
    dateLabel: "12–18 октября 2026",
    startsAt: "2026-10-12T00:00:00+03:00",
    endsAt: "2026-10-19T00:00:00+03:00",
    prizes: dotaPlusRacePrizes,
    quests: OCTOBER_SECOND_RACE_QUESTS,
  },
  {
    id: "2026-10-19",
    title: "Гонка за звёздами · Финал",
    dateLabel: "19–25 октября 2026",
    startsAt: "2026-10-19T00:00:00+03:00",
    endsAt: OCTOBER_COMPENDIUM_END_AT,
    prizes: unannouncedPrizes,
    quests: OCTOBER_THIRD_RACE_QUESTS,
  },
];

export function octoberRaceForMoment(now: Date): OctoberCompendiumWeekDefinition {
  const nowMs = now.getTime();
  return OCTOBER_COMPENDIUM_WEEKS.find(
    (week) => nowMs >= Date.parse(week.startsAt) && nowMs < Date.parse(week.endsAt),
  ) ?? OCTOBER_COMPENDIUM_WEEKS.find(
    (week) => nowMs < Date.parse(week.startsAt),
  ) ?? OCTOBER_COMPENDIUM_WEEKS.at(-1)!;
}
