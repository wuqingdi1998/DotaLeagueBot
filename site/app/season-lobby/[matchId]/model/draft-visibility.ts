import type { SeasonLobbyRoomStatus } from "./types";

const visibleDraftStatuses = new Set<SeasonLobbyRoomStatus>([
  "drafting",
  "playing",
  "break",
]);

export function shouldShowSeasonLobbyDraft(
  status: SeasonLobbyRoomStatus,
): boolean {
  return visibleDraftStatuses.has(status);
}

export function canAdvanceSeasonLobbyDraft(
  status: SeasonLobbyRoomStatus,
): boolean {
  return status === "break";
}
