import { randomInt } from "node:crypto";

export function randomCoinTossWinner(
  players: readonly [string, string],
): string {
  return players[randomInt(2)];
}
