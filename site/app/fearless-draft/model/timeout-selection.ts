export function selectTimedOutPickHero(
  availableHeroIds: readonly number[],
  highlightedHeroId: number | null,
  randomIndex: number,
): number | undefined {
  if (
    highlightedHeroId !== null &&
    availableHeroIds.includes(highlightedHeroId)
  ) {
    return highlightedHeroId;
  }
  return availableHeroIds[randomIndex];
}
