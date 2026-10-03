export type ProfileOwnerOverride = {
  badgeLabel: string;
  canCustomizeBackground: boolean;
};

const profileOwnerOverrides: Readonly<Record<string, ProfileOwnerOverride>> = {
  "301109815": {
    badgeLabel: "Admin",
    canCustomizeBackground: true,
  },
};

export function profileOwnerOverrideForDotaId(
  dotaId: string,
): ProfileOwnerOverride | null {
  return profileOwnerOverrides[dotaId] ?? null;
}
