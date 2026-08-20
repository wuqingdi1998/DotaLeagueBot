/**
 * The primary Arcana item for every hero that has an Arcana in Dota 2
 * (catalog checked on 2026-08-20).
 *
 * Bundles, gems, service tools and separate ability-effect wearables are
 * intentionally excluded: equipping the primary item is what proves that the
 * player used the Arcana in the match.
 */
export const ARCANA_WEARABLE_ITEMS = [
  { itemId: 4794, heroId: 25, hero: "Lina", name: "Fiery Soul of the Slayer" },
  { itemId: 5810, heroId: 104, hero: "Legion Commander", name: "Blades of Voth Domosh" },
  { itemId: 5957, heroId: 109, hero: "Terrorblade", name: "Fractal Horns of Inner Abysm" },
  { itemId: 6879, heroId: 105, hero: "Techies", name: "Swine of the Sunken Galley" },
  { itemId: 6914, heroId: 22, hero: "Zeus", name: "Tempest Helm of the Thundergod" },
  { itemId: 6996, heroId: 11, hero: "Shadow Fiend", name: "Demon Eater" },
  { itemId: 7247, heroId: 44, hero: "Phantom Assassin", name: "Manifold Paradox" },
  { itemId: 7385, heroId: 5, hero: "Crystal Maiden", name: "Frost Avalanche" },
  { itemId: 7756, heroId: 14, hero: "Pudge", name: "Feast of Abscession" },
  { itemId: 9050, heroId: 114, hero: "Monkey King", name: "Great Sage's Reckoning" },
  { itemId: 9059, heroId: 8, hero: "Juggernaut", name: "Bladeform Legacy" },
  { itemId: 9235, heroId: 91, hero: "Io", name: "Benevolent Companion" },
  { itemId: 9662, heroId: 67, hero: "Spectre", name: "Phantom Advent" },
  { itemId: 12451, heroId: 86, hero: "Rubick", name: "The Magus Cypher" },
  { itemId: 12692, heroId: 7, hero: "Earthshaker", name: "Planetfall" },
  { itemId: 12930, heroId: 39, hero: "Queen of Pain", name: "Eminence of Ristul" },
  { itemId: 13456, heroId: 42, hero: "Wraith King", name: "Crown of the One True King" },
  { itemId: 13670, heroId: 84, hero: "Ogre Magi", name: "Flockheart's Gamble" },
  { itemId: 13806, heroId: 21, hero: "Windranger", name: "Compass of the Rising Gale" },
  { itemId: 18033, heroId: 41, hero: "Faceless Void", name: "Claszian Apostasy Head" },
  { itemId: 18539, heroId: 101, hero: "Skywrath Mage", name: "The Devotions of Dragonus - Wings" },
  { itemId: 19090, heroId: 6, hero: "Drow Ranger", name: "Dread Retribution" },
  { itemId: 22718, heroId: 20, hero: "Vengeful Spirit", name: "The Resurrection of Shen - Wings" },
  { itemId: 23095, heroId: 15, hero: "Razor", name: "Voidstorm Asylum Tormentor" },
] as const;

const ARCANA_ITEM_IDS = new Set<number>(
  ARCANA_WEARABLE_ITEMS.map(({ itemId }) => itemId),
);
const ARCANA_HERO_IDS = new Set<number>(
  ARCANA_WEARABLE_ITEMS.map(({ heroId }) => heroId),
);

export function isArcanaItemId(itemId: number): boolean {
  return ARCANA_ITEM_IDS.has(itemId);
}

export function isArcanaHeroId(heroId: number): boolean {
  return ARCANA_HERO_IDS.has(heroId);
}
