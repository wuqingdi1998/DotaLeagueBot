import type { DraftFormat } from "./types";

export function draftSeriesMapCount(format: DraftFormat): number {
  return format === "BO2" ? 2 : 3;
}

export function mapNeedsCoinToss(mapNumber: number): boolean {
  return mapNumber === 1 || mapNumber === 3;
}

/** Determines who receives the first choice, never First Pick automatically. */
export function firstChooserForMap(input: {
  mapNumber: number;
  player1Id: string;
  player2Id: string;
  map1CoinTossWinnerId: string;
  currentCoinTossWinnerId?: string | null;
}): string {
  if (input.mapNumber === 2) {
    return input.map1CoinTossWinnerId === input.player1Id
      ? input.player2Id
      : input.player1Id;
  }
  if (!input.currentCoinTossWinnerId) {
    throw new Error("Для первой и третьей карты нужен результат монетки");
  }
  return input.currentCoinTossWinnerId;
}
