import type { StarRaceWeekDefinition } from "../../model/star-race";

export const TEST_COMPENDIUM = {
  title: "Компендиум", subtitle: "Сезон 9. Часть 1.", dateLabel: "5–25 октября 2026",
  playerId: "sandbox-player", partnerId: "sandbox-partner", clanId: "morbus",
  dailyReward: 1, weekendReward: 2, firstReroll: 25, secondReroll: 60,
  bonusStars: 20, goldThreshold: 80,
} as const;
export const TEST_SECTIONS = [
  { id: "test-clans", label: "Кланы" }, { id: "test-personal", label: "Личный зачёт" },
  { id: "test-race", label: "Гонка" }, { id: "test-daily", label: "Задания" },
] as const;

/** Independent test calendar. It is never loaded from the live event definition. */
export const TEST_RACE_WEEK: StarRaceWeekDefinition = {
  id: "sandbox-final-week", title: "Гонка за звёздами · Финал", dateLabel: "19–25 октября 2026",
  startsAt: "2026-10-19T00:00:00+03:00", endsAt: "2026-10-26T00:00:00+03:00",
  prizes: [{ place: 1, title: "Предмет выберем позже", imageUrl: null }, { place: 2, title: "Предмет выберем позже", imageUrl: null }],
  quests: ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"].map((weekday, index) => ({
    dateKey: `2026-10-${19 + index}`, weekday, dateLabel: `${19 + index} октября`,
    title: null, description: null, rewardStars: index === 6 ? 5 : 4, requirement: null,
  })),
};

export function testDayBounds(index: number) {
  const start = new Date(`${TEST_RACE_WEEK.quests[index].dateKey}T00:00:00+03:00`);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}
