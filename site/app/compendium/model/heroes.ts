import heroCatalog from "./heroes.json";
import type { CompendiumHero, HeroPrimaryAttribute } from "./types";

const dotaImageRoot =
  "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes";
const verticalPortraitImageRoot =
  "https://courier.spectral.gg/images/dota/portraits_vert";
const heroImageVersion = "2026-08-01";

const heroKeys = new Set(heroCatalog.map((hero) => hero.key));

export type CompendiumHeroImageVariant = "horizontal" | "vertical";

export function compendiumHeroImageSource(
  heroKey: string,
  variant: CompendiumHeroImageVariant = "horizontal",
): string | null {
  if (!heroKeys.has(heroKey)) return null;
  if (variant === "vertical") {
    return `${verticalPortraitImageRoot}/${heroKey}.png`;
  }
  return `${dotaImageRoot}/${heroKey}.png`;
}

export function compendiumHeroImageUrl(
  heroKey: string,
  variant: CompendiumHeroImageVariant = "horizontal",
): string {
  const variantQuery = variant === "vertical" ? "&variant=vertical" : "";
  return `/api/compendium/heroes/${heroKey}?v=${heroImageVersion}${variantQuery}`;
}

export const COMPENDIUM_HEROES: CompendiumHero[] = heroCatalog.map((hero) => ({
  ...hero,
  primaryAttribute: hero.primaryAttribute as HeroPrimaryAttribute,
  imageUrl: compendiumHeroImageUrl(hero.key),
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
