import snapshot from "./presentation.json";
import type { RewardMilestone } from "../../model/rewards";
import type { OctoberClanMember } from "@/app/organizer/compendium-october/model/clan-members";
import { TEST_COMPENDIUM } from "./config";
import { testTotals, type TestState } from "./state";
import { TEST_CLAN_ROSTERS } from "./roster";

export const TEST_CLANS = snapshot.clans.map((clan) => ({ ...clan, id: clan.id === "morbus" ? "morbus" as const : "panacea" as const }));
export const TEST_PRIZES = snapshot.prizes.map((prize) => ({ ...prize, pool: prize.pool === "winners" ? "winners" as const : "runners-up" as const }));
export function testRewards(stars: number): readonly RewardMilestone[] {
  return (snapshot.rewards as readonly RewardMilestone[]).filter((reward) => stars >= TEST_COMPENDIUM.goldThreshold || reward.stars <= TEST_COMPENDIUM.goldThreshold);
}
export function testMembers(state: TestState): OctoberClanMember[] {
  const totals = testTotals(state);
  return TEST_CLANS.flatMap((clan) => TEST_CLAN_ROSTERS[clan.id].map((playerName, position) => {
    const index = position + (clan.id === "morbus" ? 0 : TEST_CLAN_ROSTERS.morbus.length);
    return {
    discordId: index === 0 ? TEST_COMPENDIUM.playerId : index === 1 ? TEST_COMPENDIUM.partnerId : `sandbox-member-${index}`,
    dotaId: `sandbox-member-${index}`, playerName,
    avatarUrl: null, clanId: clan.id,
    totalPoints: index === 0 ? totals.personal : index === 1 ? totals.partner : 0,
    };
  }));
}
