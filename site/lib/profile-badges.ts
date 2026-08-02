export const profileBadgeKeys = [
  "ti-2026-bronze",
  "ti-2026-silver",
  "ti-2026-gold",
] as const;

export type ProfileBadgeKey = (typeof profileBadgeKeys)[number];

export type ProfileBadgeDefinition = {
  key: ProfileBadgeKey;
  label: string;
  tier: "bronze" | "silver" | "gold";
  shortLabel: string;
};

const profileBadgeDefinitions: Record<
  ProfileBadgeKey,
  ProfileBadgeDefinition
> = {
  "ti-2026-bronze": {
    key: "ti-2026-bronze",
    label: "Бронзовый бейдж TI 2026",
    tier: "bronze",
    shortLabel: "2026",
  },
  "ti-2026-silver": {
    key: "ti-2026-silver",
    label: "Серебряный бейдж TI 2026",
    tier: "silver",
    shortLabel: "2026",
  },
  "ti-2026-gold": {
    key: "ti-2026-gold",
    label: "Золотой бейдж TI 2026",
    tier: "gold",
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

export function ti2026ProfileBadgeForStars(
  stars: number,
): ProfileBadgeKey | null {
  if (stars >= 75) return "ti-2026-gold";
  if (stars >= 40) return "ti-2026-silver";
  if (stars >= 10) return "ti-2026-bronze";
  return null;
}
