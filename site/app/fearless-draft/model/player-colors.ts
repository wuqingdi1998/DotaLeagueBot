export const DRAFT_TEAM_PLAYER_COLORS = [
  "#22c7f2",
  "#ff9a4c",
  "#f2d94e",
  "#4bd58a",
  "#c58cff",
] as const;

export type DraftTeamPlayerColorSlot = 1 | 2 | 3 | 4 | 5;

export function draftTeamPlayerColor(slot: DraftTeamPlayerColorSlot): string {
  return DRAFT_TEAM_PLAYER_COLORS[slot - 1];
}
