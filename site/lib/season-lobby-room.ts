export const SEASON_LOBBY_PRESENCE_TTL_SECONDS = 7;
export const SEASON_LOBBY_CHAT_LIMIT = 100;
export const SEASON_LOBBY_CHAT_MAX_LENGTH = 500;

export function seasonLobbyDraftFormat(bestOf: number): "BO2" | "BO3" | null {
  if (bestOf === 2) return "BO2";
  if (bestOf === 3) return "BO3";
  return null;
}
