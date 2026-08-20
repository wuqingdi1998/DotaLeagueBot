/**
 * The primary Arcana item for every hero that has an Arcana in Dota 2
 * (catalog checked on 2026-08-20).
 *
 * Bundles, gems, service tools and separate ability-effect wearables are
 * intentionally excluded: equipping the primary item is what proves that the
 * player used the Arcana in the match.
 */
export const ARCANA_WEARABLE_ITEMS = [
  { itemId: 4794, hero: "Lina", name: "Fiery Soul of the Slayer" },
  { itemId: 5810, hero: "Legion Commander", name: "Blades of Voth Domosh" },
  { itemId: 5957, hero: "Terrorblade", name: "Fractal Horns of Inner Abysm" },
  { itemId: 6879, hero: "Techies", name: "Swine of the Sunken Galley" },
  { itemId: 6914, hero: "Zeus", name: "Tempest Helm of the Thundergod" },
  { itemId: 6996, hero: "Shadow Fiend", name: "Demon Eater" },
  { itemId: 7247, hero: "Phantom Assassin", name: "Manifold Paradox" },
  { itemId: 7385, hero: "Crystal Maiden", name: "Frost Avalanche" },
  { itemId: 7756, hero: "Pudge", name: "Feast of Abscession" },
  { itemId: 9050, hero: "Monkey King", name: "Great Sage's Reckoning" },
  { itemId: 9059, hero: "Juggernaut", name: "Bladeform Legacy" },
  { itemId: 9235, hero: "Io", name: "Benevolent Companion" },
  { itemId: 9662, hero: "Spectre", name: "Phantom Advent" },
  { itemId: 12451, hero: "Rubick", name: "The Magus Cypher" },
  { itemId: 12692, hero: "Earthshaker", name: "Planetfall" },
  { itemId: 12930, hero: "Queen of Pain", name: "Eminence of Ristul" },
  { itemId: 13456, hero: "Wraith King", name: "Crown of the One True King" },
  { itemId: 13670, hero: "Ogre Magi", name: "Flockheart's Gamble" },
  { itemId: 13806, hero: "Windranger", name: "Compass of the Rising Gale" },
  { itemId: 18033, hero: "Faceless Void", name: "Claszian Apostasy Head" },
  { itemId: 18539, hero: "Skywrath Mage", name: "The Devotions of Dragonus - Wings" },
  { itemId: 19090, hero: "Drow Ranger", name: "Dread Retribution" },
  { itemId: 22718, hero: "Vengeful Spirit", name: "The Resurrection of Shen - Wings" },
  { itemId: 23095, hero: "Razor", name: "Voidstorm Asylum Tormentor" },
] as const;

const ARCANA_ITEM_IDS = new Set<number>(
  ARCANA_WEARABLE_ITEMS.map(({ itemId }) => itemId),
);

export function isArcanaItemId(itemId: number): boolean {
  return ARCANA_ITEM_IDS.has(itemId);
}
