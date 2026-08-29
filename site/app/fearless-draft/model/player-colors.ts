export const DRAFT_TEAM_PLAYER_COLORS = [
  "#71c4dc",
  "#dfa171",
  "#d8c76f",
  "#79bd96",
  "#aa91c7",
] as const;

export type DraftTeamPlayerColorSlot = 1 | 2 | 3 | 4 | 5;

export function draftTeamPlayerColor(slot: DraftTeamPlayerColorSlot): string {
  return DRAFT_TEAM_PLAYER_COLORS[slot - 1];
}
