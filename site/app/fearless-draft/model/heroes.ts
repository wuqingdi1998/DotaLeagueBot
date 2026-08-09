import { COMPENDIUM_HEROES } from "../../compendium/model/heroes";
import type { HeroPrimaryAttribute } from "../../compendium/model/types";

// When a new Dota hero is temporarily unavailable in Captain's Mode,
// only this set needs to change; the shared site catalog remains the source.
const disabledCaptainModeHeroIds = new Set<number>();

export const HERO_ATTRIBUTE_GROUPS: readonly {
  key: HeroPrimaryAttribute;
  label: string;
}[] = [
  { key: "strength", label: "СИЛА" },
  { key: "agility", label: "ЛОВКОСТЬ" },
  { key: "intelligence", label: "ИНТЕЛЛЕКТ" },
  { key: "universal", label: "УНИВЕРСАЛЬНЫЕ" },
];

export const FEARLESS_DRAFT_HEROES = COMPENDIUM_HEROES.map((hero) => ({
  ...hero,
  isCaptainModeEnabled: !disabledCaptainModeHeroIds.has(hero.id),
}));

export const ENABLED_FEARLESS_DRAFT_HEROES = FEARLESS_DRAFT_HEROES.filter(
  (hero) => hero.isCaptainModeEnabled,
);

export function isFearlessDraftHeroEnabled(heroId: number): boolean {
  return ENABLED_FEARLESS_DRAFT_HEROES.some((hero) => hero.id === heroId);
}
