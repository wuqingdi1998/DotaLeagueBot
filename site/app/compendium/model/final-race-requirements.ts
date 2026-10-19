export type FinalRaceStatRequirement =
  | {
      readonly kind: "match-stat-win";
      readonly isRankedOnly?: boolean;
      readonly conditions: readonly { readonly stat: "assists" | "hero_healing" | "gold_per_min" | "deaths"; readonly minimum?: number; readonly maximum?: number }[];
    }
  | { readonly kind: "cumulative-assists"; readonly target: number }
  | { readonly kind: "cumulative-net-worth"; readonly target: number };
