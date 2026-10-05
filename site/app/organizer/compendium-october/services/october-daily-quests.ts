import type { AuthUser } from "@/lib/auth";
import type { DailyQuest, RuneChallengeData } from "@/app/compendium/model/types";
import { currentMoscowDay } from "@/app/compendium/model/time";
import {
  ensureDailyQuestSet,
  loadDailyQuests,
} from "@/app/compendium/services/repository";
import { dailyRerollsRemaining } from "@/app/compendium/services/reroll-repository";
import { loadRuneChallenge } from "@/app/compendium/services/rune-challenge";
import { loadClanOuting } from "@/app/compendium/services/clan-outing";
import type { ClanOutingCompletion } from "@/app/compendium/services/clan-outing-repository";

export type OctoberDailyQuestData = {
  quests: DailyQuest[];
  rerollsRemaining: number;
  runeChallenge: RuneChallengeData;
  clanOuting: ClanOutingCompletion | null;
};

/** Loads the viewer's two active October hero challenges and their shared reroll balance. */
export async function loadOctoberDailyQuests(
  user: AuthUser,
  now: Date = new Date(),
): Promise<OctoberDailyQuestData> {
  const { dateKey } = currentMoscowDay(now);
  await ensureDailyQuestSet(dateKey, user.discordId);
  const [quests, rerollsRemaining, runeChallenge, clanOuting] = await Promise.all([
    loadDailyQuests(dateKey, user.discordId),
    dailyRerollsRemaining(dateKey, user.discordId),
    loadRuneChallenge(user.discordId, dateKey),
    loadClanOuting(user.discordId, dateKey),
  ]);
  return { quests, rerollsRemaining, runeChallenge, clanOuting };
}
