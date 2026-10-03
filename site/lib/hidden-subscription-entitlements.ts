import type { subscriptionRoleNames } from "./subscription-roles";

type SubscriptionRoleName = (typeof subscriptionRoleNames)[number];

type HiddenSubscriptionEntitlement = {
  discordId: string;
  dotaId: string;
  roleName: SubscriptionRoleName;
};

const hiddenSubscriptionEntitlements: readonly HiddenSubscriptionEntitlement[] = [
  {
    discordId: "311247030422863882",
    dotaId: "301109815",
    roleName: "Руна Усиления урона",
  },
];

export const hiddenSubscriptionDiscordIds = hiddenSubscriptionEntitlements.map(
  (entitlement) => entitlement.discordId,
);

export function hiddenSubscriptionRoleForDiscordId(
  discordId: string,
): SubscriptionRoleName | null {
  return hiddenSubscriptionEntitlements.find(
    (entitlement) => entitlement.discordId === discordId,
  )?.roleName ?? null;
}

export function hiddenSubscriptionRoleForDotaId(
  dotaId: string,
): SubscriptionRoleName | null {
  return hiddenSubscriptionEntitlements.find(
    (entitlement) => entitlement.dotaId === dotaId,
  )?.roleName ?? null;
}
