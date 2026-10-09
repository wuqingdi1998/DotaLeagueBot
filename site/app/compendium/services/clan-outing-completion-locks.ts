/** Every award path locks both teammates in the same order before touching their completions or balances. */
export function clanOutingCompletionLocks(playerId: string, dateKey: string, partnerPlayerId?: string): string[] {
  return [...new Set(partnerPlayerId ? [playerId, partnerPlayerId] : [playerId])].sort()
    .map((id) => `compendium-clan-outing:${id}:${dateKey}`);
}
