import type { DraftLobbyPlayer } from "./snapshot";

export function canViewDraftHeroPreview(
  viewerId: string,
  currentActorId: string | null,
  lobbyPlayers?: DraftLobbyPlayer[],
): boolean {
  if (!currentActorId) return false;
  if (viewerId === currentActorId) return true;

  const viewer = lobbyPlayers?.find((player) => player.id === viewerId);
  const currentActor = lobbyPlayers?.find((player) => player.id === currentActorId);
  return Boolean(viewer && currentActor && viewer.teamSide === currentActor.teamSide);
}
