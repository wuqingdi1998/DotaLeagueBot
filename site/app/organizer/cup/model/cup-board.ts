export const CUP_BASKET_COUNT = 4;
export const CUP_SLOT_COUNT = 6;
export const CUP_SCORING_SLOT_COUNT = 5;
export const CUP_MINIMUM_MATCHES = 2;
export const CUP_CONSTRUCTOR_HREF = "/organizer/cup";
export const CUP_CONSTRUCTOR_ENDPOINT = "/api/admin/cup-constructor";

export type CupPlayer = {
  id: string;
  nickname: string;
  tier: number | null;
  positions: string | null;
  matchCount: number;
};

export type CupBoard = {
  pool: string[];
  baskets: (string | null)[][];
  readyPlayerIds: string[];
};

export type CupSnapshot = {
  board: CupBoard;
  revision: number;
  players: CupPlayer[];
  leagueName: string | null;
};

export type CupDestination = { basket: number; slot: number } | { poolIndex: number };

export function createCupBoard(players: CupPlayer[]): CupBoard {
  return {
    pool: players.filter((player) => player.matchCount >= CUP_MINIMUM_MATCHES).map((player) => player.id),
    baskets: Array.from({ length: CUP_BASKET_COUNT }, () => Array<string | null>(CUP_SLOT_COUNT).fill(null)),
    readyPlayerIds: [],
  };
}

export function cupBoardPlayerIds(board: CupBoard): string[] {
  return [...board.pool, ...board.baskets.flat().filter((id): id is string => id !== null)];
}

/** Empty slots retain their position; dropping onto an occupied slot swaps players. */
export function moveCupPlayer(board: CupBoard, playerId: string, destination: CupDestination): CupBoard {
  const next = structuredClone(board);
  const poolIndex = next.pool.indexOf(playerId);
  const sourceBasket = next.baskets.findIndex((basket) => basket.includes(playerId));
  const sourceSlot = sourceBasket < 0 ? -1 : next.baskets[sourceBasket].indexOf(playerId);
  if (poolIndex < 0 && sourceBasket < 0) return board;
  if ("poolIndex" in destination) {
    if (poolIndex >= 0) next.pool.splice(poolIndex, 1);
    else next.baskets[sourceBasket][sourceSlot] = null;
    const index = Math.max(0, destination.poolIndex - (poolIndex >= 0 && poolIndex < destination.poolIndex ? 1 : 0));
    next.pool.splice(index, 0, playerId);
  } else {
    if (!next.baskets[destination.basket] || destination.slot < 0 || destination.slot >= CUP_SLOT_COUNT) return board;
    const displaced = next.baskets[destination.basket][destination.slot];
    if (displaced === playerId) return board;
    if (poolIndex >= 0) next.pool.splice(poolIndex, 1, ...(displaced ? [displaced] : []));
    else next.baskets[sourceBasket][sourceSlot] = displaced;
    next.baskets[destination.basket][destination.slot] = playerId;
  }
  return next;
}

export function removeCupPlayer(board: CupBoard, playerId: string): CupBoard {
  return {
    pool: board.pool.filter((id) => id !== playerId),
    baskets: board.baskets.map((basket) => basket.map((id) => id === playerId ? null : id)),
    readyPlayerIds: board.readyPlayerIds.filter((id) => id !== playerId),
  };
}

export function toggleCupReadiness(board: CupBoard, playerId: string): CupBoard {
  if (!cupBoardPlayerIds(board).includes(playerId)) return board;
  return {
    ...board,
    readyPlayerIds: board.readyPlayerIds.includes(playerId)
      ? board.readyPlayerIds.filter((id) => id !== playerId)
      : [...board.readyPlayerIds, playerId],
  };
}

export function cupBasketTierTotal(basket: (string | null)[], players: Map<string, CupPlayer>) {
  const scoringPlayers = basket.slice(0, CUP_SCORING_SLOT_COUNT).filter((id): id is string => id !== null);
  return {
    total: scoringPlayers.reduce((sum, id) => sum + (players.get(id)?.tier ?? 0), 0),
    unknown: scoringPlayers.filter((id) => players.get(id)?.tier == null).length,
  };
}

export function parseCupBoard(value: unknown): CupBoard | null {
  if (!value || typeof value !== "object") return null;
  const board = value as Partial<CupBoard>;
  const isId = (id: unknown): id is string => typeof id === "string" && /^[1-9]\d{0,19}$/.test(id);
  if (!Array.isArray(board.pool) || !board.pool.every(isId) || board.pool.length > 2000
    || !Array.isArray(board.baskets) || board.baskets.length !== CUP_BASKET_COUNT
    || !board.baskets.every((basket) => Array.isArray(basket) && basket.length === CUP_SLOT_COUNT
      && basket.every((id) => id === null || isId(id)))
    || !Array.isArray(board.readyPlayerIds) || !board.readyPlayerIds.every(isId)) return null;
  const parsed = { pool: board.pool, baskets: board.baskets, readyPlayerIds: board.readyPlayerIds };
  const ids = cupBoardPlayerIds(parsed);
  if (new Set(ids).size !== ids.length || new Set(parsed.readyPlayerIds).size !== parsed.readyPlayerIds.length
    || parsed.readyPlayerIds.some((id) => !ids.includes(id))) return null;
  return parsed;
}
