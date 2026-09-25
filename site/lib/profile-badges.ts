import { OCTOBER_CLANS, type OctoberClanId } from "./october-clans";
import { OCTOBER_REWARD_STARS } from "./october-reward-thresholds";

export const profileBadgeKeys = [
  "ti-2026-bronze",
  "ti-2026-silver",
  "ti-2026-gold",
  "october-2026-morbus-bronze",
  "october-2026-morbus-silver",
  "october-2026-morbus-gold",
  "october-2026-morbus-platinum",
  "october-2026-panacea-bronze",
  "october-2026-panacea-silver",
  "october-2026-panacea-gold",
  "october-2026-panacea-platinum",
] as const;

export type ProfileBadgeKey = (typeof profileBadgeKeys)[number];

export type ProfileBadgeDefinition = {
  key: ProfileBadgeKey;
  eventKey: string;
  label: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  tierRank: number;
  shortLabel: string;
  clanId?: OctoberClanId;
};

const octoberTierNames = {
  bronze: "бронзовый",
  silver: "серебряный",
  gold: "золотой",
  platinum: "платиновый",
} as const;

function octoberBadgeDefinition(
  key: ProfileBadgeKey,
  clanId: OctoberClanId,
  tier: keyof typeof octoberTierNames,
  tierRank: number,
): ProfileBadgeDefinition {
  const clan = OCTOBER_CLANS.find((entry) => entry.id === clanId)!;
  return {
    key,
    eventKey: "october-2026-compendium",
    label: `${octoberTierNames[tier]} бейдж клана «${clan.name}» · Компендиум октября 2026`,
    tier,
    tierRank,
    shortLabel: clan.name,
    clanId,
  };
}

const profileBadgeDefinitions: Record<
  ProfileBadgeKey,
  ProfileBadgeDefinition
> = {
  "ti-2026-bronze": {
    key: "ti-2026-bronze",
    eventKey: "the-international-2026-compendium",
    label: "Бейдж Компендиума TI 2026 (бронзовый)",
    tier: "bronze",
    tierRank: 1,
    shortLabel: "2026",
  },
  "ti-2026-silver": {
    key: "ti-2026-silver",
    eventKey: "the-international-2026-compendium",
    label: "Бейдж Компендиума TI 2026 (серебрянный)",
    tier: "silver",
    tierRank: 2,
    shortLabel: "2026",
  },
  "ti-2026-gold": {
    key: "ti-2026-gold",
    eventKey: "the-international-2026-compendium",
    label: "Бейдж Компендиума TI 2026 (золотой)",
    tier: "gold",
    tierRank: 3,
    shortLabel: "2026",
  },
  "october-2026-morbus-bronze": octoberBadgeDefinition("october-2026-morbus-bronze", "morbus", "bronze", 1),
  "october-2026-morbus-silver": octoberBadgeDefinition("october-2026-morbus-silver", "morbus", "silver", 2),
  "october-2026-morbus-gold": octoberBadgeDefinition("october-2026-morbus-gold", "morbus", "gold", 3),
  "october-2026-morbus-platinum": octoberBadgeDefinition("october-2026-morbus-platinum", "morbus", "platinum", 4),
  "october-2026-panacea-bronze": octoberBadgeDefinition("october-2026-panacea-bronze", "panacea", "bronze", 1),
  "october-2026-panacea-silver": octoberBadgeDefinition("october-2026-panacea-silver", "panacea", "silver", 2),
  "october-2026-panacea-gold": octoberBadgeDefinition("october-2026-panacea-gold", "panacea", "gold", 3),
  "october-2026-panacea-platinum": octoberBadgeDefinition("october-2026-panacea-platinum", "panacea", "platinum", 4),
};

export function profileBadgeDefinition(
  badgeKey: string | null,
): ProfileBadgeDefinition | null {
  if (!badgeKey || !profileBadgeKeys.includes(badgeKey as ProfileBadgeKey)) {
    return null;
  }
  return profileBadgeDefinitions[badgeKey as ProfileBadgeKey];
}

export function selectProfileBadgesForDisplay(
  badgeKeys: readonly string[],
): ProfileBadgeKey[] {
  const selectedByEvent = new Map<string, ProfileBadgeDefinition>();

  for (const badgeKey of badgeKeys) {
    const badge = profileBadgeDefinition(badgeKey);
    if (!badge) continue;

    const selectedBadge = selectedByEvent.get(badge.eventKey);
    if (!selectedBadge || badge.tierRank > selectedBadge.tierRank) {
      selectedByEvent.set(badge.eventKey, badge);
    }
  }

  return Array.from(selectedByEvent.values(), (badge) => badge.key);
}

export function ti2026ProfileBadgeForStars(
  stars: number,
): ProfileBadgeKey | null {
  if (stars >= 60) return "ti-2026-gold";
  if (stars >= 30) return "ti-2026-silver";
  if (stars >= 10) return "ti-2026-bronze";
  return null;
}

export function october2026ProfileBadgeForStars(
  stars: number,
  clanId: OctoberClanId,
): ProfileBadgeKey | null {
  const tier = stars >= OCTOBER_REWARD_STARS.platinumBadge ? "platinum"
    : stars >= OCTOBER_REWARD_STARS.goldBadge ? "gold"
    : stars >= OCTOBER_REWARD_STARS.silverBadge ? "silver"
    : stars >= OCTOBER_REWARD_STARS.bronzeBadge ? "bronze"
    : null;
  return tier ? `october-2026-${clanId}-${tier}` : null;
}
