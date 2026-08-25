export const SEASON_LOBBY_PRESENCE_TTL_SECONDS = 7;
export const SEASON_LOBBY_CHAT_LIMIT = 100;
export const SEASON_LOBBY_CHAT_MAX_LENGTH = 500;

export type CaptainVoteCandidate = {
  playerId: string;
  voteCount: number;
  tier: number | null;
  slotNumber: number | null;
};

export function chooseSeasonLobbyCaptain(
  candidates: CaptainVoteCandidate[],
): CaptainVoteCandidate | null {
  return [...candidates].sort((left, right) =>
    right.voteCount - left.voteCount ||
    (right.tier ?? 0) - (left.tier ?? 0) ||
    (left.slotNumber ?? Number.MAX_SAFE_INTEGER) -
      (right.slotNumber ?? Number.MAX_SAFE_INTEGER) ||
    left.playerId.localeCompare(right.playerId)
  )[0] ?? null;
}

export function seasonLobbyDraftFormat(bestOf: number): "BO2" | "BO3" | null {
  if (bestOf === 2) return "BO2";
  if (bestOf === 3) return "BO3";
  return null;
}
