import type { ClanDailyActivity } from "@/app/organizer/compendium-october/model/clan-daily-activity";
import { TEST_COMPENDIUM, TEST_RACE_WEEK, testDayBounds } from "./config";
import { testMembers } from "./presentation";
import { testCompletionKey, testReward, type TestState } from "./state";
import { finalRacePreviewReward } from "./final-race";

export function testClanActivity(state: TestState): ClanDailyActivity {
  const day = state.race.activeDay;
  const date = TEST_RACE_WEEK.quests[day];
  const bounds = testDayBounds(day);
  return { dateLabel: `${date.weekday}, ${date.dateLabel}`, serverNow: bounds.start.toISOString(), resetsAt: bounds.end.toISOString(), isActive: true,
    members: testMembers(state).map((member) => {
      const isPlayer = member.discordId === TEST_COMPENDIUM.playerId;
      const isPartner = member.discordId === TEST_COMPENDIUM.partnerId;
      const reward = testReward(day);
      const quests = [
        { label: "ГЗЗ", description: "Гонка за звёздами", rewardStars: finalRacePreviewReward(day),
          isAvailable: true, isCompleted: isPlayer && state.race.completedDays.includes(day) },
        ...(["daily-1", "daily-2", "outing", "rune"] as const).map((kind, index) => ({
          label: ["И1", "И2", "И3", "ИР"][index], description: ["Испытание 1", "Испытание 2", "Клановая вылазка", "Испытание Рун"][index], rewardStars: reward,
          isAvailable: kind !== "rune" || state.hasRuneAccess,
          isCompleted: (isPlayer || (isPartner && kind === "outing")) && state.completed.includes(testCompletionKey(day, kind)),
        })),
      ];
      return { ...member, quests, dailyStars: quests.reduce((total, quest) => total + (quest.isCompleted ? quest.rewardStars : 0), 0) };
    }),
  };
}
