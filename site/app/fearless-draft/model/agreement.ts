export type NextMapReadiness = {
  player1Id: string;
  player2Id: string;
  player1Ready: boolean;
  player2Ready: boolean;
};

export function markNextMapReady(
  state: NextMapReadiness,
  playerId: string,
): Pick<NextMapReadiness, "player1Ready" | "player2Ready"> & {
  shouldAdvance: boolean;
} {
  if (playerId !== state.player1Id && playerId !== state.player2Id) {
    throw new Error("Пользователь не участвует в этой серии");
  }
  const player1Ready = state.player1Ready || playerId === state.player1Id;
  const player2Ready = state.player2Ready || playerId === state.player2Id;
  return { player1Ready, player2Ready, shouldAdvance: player1Ready && player2Ready };
}

export function canRespondToDraftEndRequest(
  requestedByPlayerId: string,
  respondingPlayerId: string,
): boolean {
  return requestedByPlayerId !== respondingPlayerId;
}

export function draftEndRequestExpiresAt(requestedAt: Date): Date {
  return new Date(
    requestedAt.getTime() + DRAFT_END_REQUEST_TTL_MINUTES * 60_000,
  );
}
import { DRAFT_END_REQUEST_TTL_MINUTES } from "./config";
