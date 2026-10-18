export const OPTIMAL_SEASON_LOBBY_VARIANTS = [
  "optimal",
  "optimal2",
  "optimal3",
  "optimal4",
  "optimal5",
] as const;

export const SEASON_LOBBY_OPTIMIZATION_VARIANTS = [
  ...OPTIMAL_SEASON_LOBBY_VARIANTS,
  "together",
  "challenge",
  "challengeAlt",
] as const;

export type SeasonLobbyOptimizationVariant =
  (typeof SEASON_LOBBY_OPTIMIZATION_VARIANTS)[number];

export function isChallengeSeasonLobbyVariant(variant: SeasonLobbyOptimizationVariant) {
  return variant === "challenge" || variant === "challengeAlt";
}

export function optimalSeasonLobbyVariantIndex(
  variant: SeasonLobbyOptimizationVariant,
): number {
  return OPTIMAL_SEASON_LOBBY_VARIANTS.findIndex((option) => option === variant);
}
