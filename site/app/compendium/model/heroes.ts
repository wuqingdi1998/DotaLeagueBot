import heroCatalog from "./heroes.json";
import type { CompendiumHero } from "./types";

const dotaImageRoot =
  "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes";

export const COMPENDIUM_HEROES: CompendiumHero[] = heroCatalog.map((hero) => ({
  ...hero,
  imageUrl: `${dotaImageRoot}/${hero.key}.png`,
}));

const heroesById = new Map(
  COMPENDIUM_HEROES.map((hero) => [hero.id, hero] as const),
);

export function compendiumHeroById(heroId: number): CompendiumHero {
  const hero = heroesById.get(heroId);
  if (!hero) throw new Error(`Неизвестный герой Dota 2: ${heroId}`);
  return hero;
}
