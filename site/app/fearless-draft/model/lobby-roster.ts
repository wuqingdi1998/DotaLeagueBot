import type { DraftLobbyPlayer } from "./snapshot";

export function draftLobbyTeamForCaptain(
  players: DraftLobbyPlayer[],
  captainId: string,
) {
  const captain = players.find((player) => player.id === captainId);
  if (!captain) return [];
  return players
    .filter((player) => player.teamSide === captain.teamSide)
    .sort((left, right) => {
      if (left.id === captainId) return -1;
      if (right.id === captainId) return 1;
      return (left.slotNumber ?? Number.MAX_SAFE_INTEGER) -
        (right.slotNumber ?? Number.MAX_SAFE_INTEGER);
    });
}
