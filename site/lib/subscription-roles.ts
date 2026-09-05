export const subscriptionRoleNames = [
  "Руна Регенерации",
  "Руна Ускорения",
  "Руна Невидимости",
  "Руна Волшебства",
  "Руна Иллюзий",
  "Руна Усиления урона",
  "Руна Воды",
] as const;

export const supporterRoleName = "Суппортеры" as const;
export const supporterRoleId = "1506420703254286478" as const;

export const customizableSubscriptionRoleNames = subscriptionRoleNames.filter(
  (role) => role !== "Руна Воды",
);

export const runeChallengeAccessRoleNames = [
  ...customizableSubscriptionRoleNames,
  supporterRoleName,
] as const;
