import type { StarRaceWeekDefinition } from "@/app/compendium/model/star-race";
import {
  OCTOBER_FIRST_RACE_QUESTS,
  OCTOBER_SECOND_RACE_QUESTS,
  OCTOBER_THIRD_RACE_QUESTS,
} from "./race-quests";

export const OCTOBER_COMPENDIUM_START_AT = "2026-10-05T00:00:00+03:00";
export const OCTOBER_COMPENDIUM_END_AT = "2026-10-26T00:00:00+03:00";

const unannouncedPrizes = [
  { place: 1, title: "Предмет за 1-е место – объявим позже", imageUrl: null },
  { place: 2, title: "Предмет за 2-е место – объявим позже", imageUrl: null },
] as const;

export const OCTOBER_COMPENDIUM_WEEKS: readonly StarRaceWeekDefinition[] = [
  {
    id: "2026-10-05",
    title: "Гонка за звёздами · Разгон",
    dateLabel: "5–11 октября 2026",
    startsAt: OCTOBER_COMPENDIUM_START_AT,
    endsAt: "2026-10-12T00:00:00+03:00",
    prizes: unannouncedPrizes,
    quests: OCTOBER_FIRST_RACE_QUESTS,
  },
  {
    id: "2026-10-12",
    title: "Гонка за звёздами · Темп",
    dateLabel: "12–18 октября 2026",
    startsAt: "2026-10-12T00:00:00+03:00",
    endsAt: "2026-10-19T00:00:00+03:00",
    prizes: unannouncedPrizes,
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

export function octoberRaceForMoment(now: Date): StarRaceWeekDefinition {
  const nowMs = now.getTime();
  return OCTOBER_COMPENDIUM_WEEKS.find(
    (week) => nowMs >= Date.parse(week.startsAt) && nowMs < Date.parse(week.endsAt),
  ) ?? OCTOBER_COMPENDIUM_WEEKS.find(
    (week) => nowMs < Date.parse(week.startsAt),
  ) ?? OCTOBER_COMPENDIUM_WEEKS.at(-1)!;
}
