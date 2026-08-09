import { COMPENDIUM_HEROES } from "../../compendium/model/heroes";

// When a new Dota hero is temporarily unavailable in Captain's Mode,
// only this set needs to change; the shared site catalog remains the source.
const disabledCaptainModeHeroIds = new Set<number>();

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
