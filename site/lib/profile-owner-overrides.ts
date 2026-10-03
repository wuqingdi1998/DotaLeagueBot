import { hiddenSubscriptionRoleForDotaId } from "./hidden-subscription-entitlements";

export type ProfileOwnerOverride = {
  badgeLabel: string;
  canCustomizeBackground: boolean;
};

const profileOwnerOverrides: Readonly<Record<string, ProfileOwnerOverride>> = {
  "301109815": {
    badgeLabel: "Admin",
    canCustomizeBackground:
      hiddenSubscriptionRoleForDotaId("301109815") !== null,
  },
};

export function profileOwnerOverrideForDotaId(
  dotaId: string,
): ProfileOwnerOverride | null {
  return profileOwnerOverrides[dotaId] ?? null;
}
