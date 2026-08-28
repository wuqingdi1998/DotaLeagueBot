import type { DraftLobbyPlayer } from "./snapshot";

export function draftLobbyTeamForCaptain(
  players: DraftLobbyPlayer[],
  captainId: string,
) {
  const captain = players.find((player) => player.id === captainId);
  return captain
    ? players.filter((player) => player.teamSide === captain.teamSide)
    : [];
}
