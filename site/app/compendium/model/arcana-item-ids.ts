const ARCANA_ITEM_IDS = new Set([
  4794, 5810, 5957, 6879, 6914, 6996, 7247, 7385, 7756, 9050,
  9059, 9235, 9662, 12451, 12692, 12930, 13456, 13670, 13806,
  18033, 18539, 19090, 22718, 23095, 35989,
]);

export function isArcanaItemId(itemId: number): boolean {
  return ARCANA_ITEM_IDS.has(itemId);
}
