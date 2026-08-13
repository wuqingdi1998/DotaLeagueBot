import { randomInt } from "node:crypto";
import {
  COIN_TOSS_SEGMENT_COUNT,
  coinTossWinnerIndex,
} from "../model/coin-toss";

export type CoinTossResult = {
  winnerId: string;
  segment: number;
};

export function randomCoinTossResult(
  players: readonly [string, string],
): CoinTossResult {
  const segment = randomInt(COIN_TOSS_SEGMENT_COUNT);
  return {
    winnerId: players[coinTossWinnerIndex(segment)],
    segment,
  };
}

export function randomCoinTossWinner(
  players: readonly [string, string],
): string {
  return randomCoinTossResult(players).winnerId;
}
