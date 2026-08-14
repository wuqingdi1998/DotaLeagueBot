import {
  COMPENDIUM_HEROES,
  compendiumHeroImageUrl,
} from "../../compendium/model/heroes";
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
  portraitUrl: compendiumHeroImageUrl(hero.key, "vertical"),
  isCaptainModeEnabled: !disabledCaptainModeHeroIds.has(hero.id),
}));

export const FEARLESS_DRAFT_HEROES_BY_ID = new Map(
  FEARLESS_DRAFT_HEROES.map((hero) => [hero.id, hero]),
);

export const FEARLESS_DRAFT_HERO_PORTRAIT_URLS = FEARLESS_DRAFT_HEROES.map(
  (hero) => hero.portraitUrl,
);

export function sortHeroesAlphabetically<T extends { name: string }>(
  heroes: readonly T[],
): T[] {
  return [...heroes].sort((left, right) => left.name.localeCompare(right.name, "en"));
}

export const ENABLED_FEARLESS_DRAFT_HEROES = FEARLESS_DRAFT_HEROES.filter(
  (hero) => hero.isCaptainModeEnabled,
);

export function isFearlessDraftHeroEnabled(heroId: number): boolean {
  return ENABLED_FEARLESS_DRAFT_HEROES.some((hero) => hero.id === heroId);
}
