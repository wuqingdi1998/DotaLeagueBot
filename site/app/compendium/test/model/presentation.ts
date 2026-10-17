import snapshot from "./presentation.json";
import type { RewardMilestone } from "../../model/rewards";
import type { OctoberClanMember } from "@/app/organizer/compendium-october/model/clan-members";
import { TEST_COMPENDIUM } from "./config";
import { testTotals, type TestState } from "./state";

export const TEST_CLANS = snapshot.clans.map((clan) => ({ ...clan, id: clan.id === "morbus" ? "morbus" as const : "panacea" as const }));
export const TEST_PRIZES = snapshot.prizes;
export function testRewards(stars: number): readonly RewardMilestone[] {
  return (snapshot.rewards as readonly RewardMilestone[]).filter((reward) => stars >= TEST_COMPENDIUM.goldThreshold || reward.stars <= TEST_COMPENDIUM.goldThreshold);
}
export function testMembers(state: TestState): OctoberClanMember[] {
  const totals = testTotals(state);
  return Array.from({ length: 6 }, (_, index) => ({
    discordId: index === 0 ? TEST_COMPENDIUM.playerId : index === 1 ? TEST_COMPENDIUM.partnerId : `sandbox-member-${index}`,
    dotaId: `sandbox-member-${index}`, playerName: index === 0 ? "Вы (тест)" : `Тестовый участник ${index + 1}`,
    avatarUrl: null, clanId: index < 3 ? "morbus" : "panacea",
    totalPoints: index === 0 ? totals.personal : index === 1 ? totals.partner : 0,
  }));
}
