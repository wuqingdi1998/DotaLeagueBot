export type SeasonLobbyTeamSide = "a" | "b";

export type SeasonLobbySlot = {
  matchId: number;
  teamSide: SeasonLobbyTeamSide;
  slotNumber: number;
};

export type SeasonLobbyPlayerPlacement = SeasonLobbySlot & {
  playerId: string;
  tierSnapshot: number | null;
};

export function seasonLobbySlotsAreEqual(
  left: SeasonLobbySlot,
  right: SeasonLobbySlot,
) {
  return (
    left.matchId === right.matchId &&
    left.teamSide === right.teamSide &&
    left.slotNumber === right.slotNumber
  );
}

export function planSeasonLobbySlotDrop({
  destination,
  draggedPlayer,
  occupiedPlayer,
  source,
}: {
  destination: SeasonLobbySlot;
  draggedPlayer: Pick<SeasonLobbyPlayerPlacement, "playerId" | "tierSnapshot">;
  occupiedPlayer: Pick<
    SeasonLobbyPlayerPlacement,
    "playerId" | "tierSnapshot"
  > | null;
  source: SeasonLobbySlot | null;
}): SeasonLobbyPlayerPlacement[] {
  const placements: SeasonLobbyPlayerPlacement[] = [
    { ...destination, ...draggedPlayer },
  ];
  if (source && occupiedPlayer && occupiedPlayer.playerId !== draggedPlayer.playerId) {
    placements.push({ ...source, ...occupiedPlayer });
  }
  return placements;
}
