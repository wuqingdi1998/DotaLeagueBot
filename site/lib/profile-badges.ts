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
    label: "Бейдж Компендиума TI 2026 (бронзовый)",
    tier: "bronze",
    shortLabel: "2026",
  },
  "ti-2026-silver": {
    key: "ti-2026-silver",
    label: "Бейдж Компендиума TI 2026 (серебрянный)",
    tier: "silver",
    shortLabel: "2026",
  },
  "ti-2026-gold": {
    key: "ti-2026-gold",
    label: "Бейдж Компендиума TI 2026 (золотой)",
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
  if (stars >= 60) return "ti-2026-gold";
  if (stars >= 30) return "ti-2026-silver";
  if (stars >= 10) return "ti-2026-bronze";
  return null;
}
