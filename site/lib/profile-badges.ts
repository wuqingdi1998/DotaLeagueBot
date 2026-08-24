export const profileBadgeKeys = [
  "ti-2026-bronze",
  "ti-2026-silver",
  "ti-2026-gold",
] as const;

export type ProfileBadgeKey = (typeof profileBadgeKeys)[number];

export type ProfileBadgeDefinition = {
  key: ProfileBadgeKey;
  eventKey: string;
  label: string;
  tier: "bronze" | "silver" | "gold";
  tierRank: number;
  shortLabel: string;
};

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
