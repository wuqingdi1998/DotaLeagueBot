import type { AuthUser } from "@/lib/auth";
import type { DailyQuest } from "@/app/compendium/model/types";
import { currentMoscowDay } from "@/app/compendium/model/time";
import {
  ensureDailyQuestSet,
  loadDailyQuests,
} from "@/app/compendium/services/repository";
import { dailyRerollsRemaining } from "@/app/compendium/services/reroll-repository";

export type OctoberDailyQuestData = {
  quests: DailyQuest[];
  rerollsRemaining: number;
};

/** Loads the viewer's two active October hero challenges and their shared reroll balance. */
export async function loadOctoberDailyQuests(
  user: AuthUser,
  now: Date = new Date(),
): Promise<OctoberDailyQuestData> {
  const { dateKey } = currentMoscowDay(now);
  await ensureDailyQuestSet(dateKey, user.discordId);
  const [quests, rerollsRemaining] = await Promise.all([
    loadDailyQuests(dateKey, user.discordId),
    dailyRerollsRemaining(dateKey, user.discordId),
  ]);
  return { quests, rerollsRemaining };
}
