export type CompendiumPeriod = "october" | "ti-2026";

export function compendiumPeriodTables(period: CompendiumPeriod) {
  return period === "october" ? {
    totals: "compendium_player_star_totals",
    operations: "october_compendium_reward_operations",
    raceEvents: "compendium_star_race_events",
  } : {
    totals: "ti_2026_compendium_player_star_totals",
    operations: "ti_2026_compendium_reward_operations",
    raceEvents: "ti_2026_compendium_star_race_events",
  };
}
