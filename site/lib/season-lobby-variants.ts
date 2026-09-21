export const OPTIMAL_SEASON_LOBBY_VARIANTS = [
  "optimal",
  "optimal2",
  "optimal3",
  "optimal4",
  "optimal5",
  "optimal6",
  "optimal7",
  "optimal8",
  "optimal9",
] as const;

export const SEASON_LOBBY_OPTIMIZATION_VARIANTS = [
  ...OPTIMAL_SEASON_LOBBY_VARIANTS,
  "together",
  "challenge",
] as const;

export type SeasonLobbyOptimizationVariant =
  (typeof SEASON_LOBBY_OPTIMIZATION_VARIANTS)[number];

export function optimalSeasonLobbyVariantIndex(
  variant: SeasonLobbyOptimizationVariant,
): number {
  return OPTIMAL_SEASON_LOBBY_VARIANTS.findIndex((option) => option === variant);
}
