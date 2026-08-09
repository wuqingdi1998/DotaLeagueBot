import heroCatalog from "./heroes.json";
import type { CompendiumHero, HeroPrimaryAttribute } from "./types";

const dotaImageRoot =
  "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes";
const heroImageVersion = "2026-08-01";

const heroKeys = new Set(heroCatalog.map((hero) => hero.key));

export function compendiumHeroImageSource(heroKey: string): string | null {
  if (!heroKeys.has(heroKey)) return null;
  return `${dotaImageRoot}/${heroKey}.png`;
}

export const COMPENDIUM_HEROES: CompendiumHero[] = heroCatalog.map((hero) => ({
  ...hero,
  primaryAttribute: hero.primaryAttribute as HeroPrimaryAttribute,
  imageUrl: `/api/compendium/heroes/${hero.key}?v=${heroImageVersion}`,
}));

export const COMPENDIUM_HERO_IMAGE_URLS = COMPENDIUM_HEROES.map(
  (hero) => hero.imageUrl,
);

const heroesById = new Map(
  COMPENDIUM_HEROES.map((hero) => [hero.id, hero] as const),
);

export function compendiumHeroById(heroId: number): CompendiumHero {
  const hero = heroesById.get(heroId);
  if (!hero) throw new Error(`Неизвестный герой Dota 2: ${heroId}`);
  return hero;
}
