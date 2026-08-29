import type { DraftHeroSuggestion } from "./snapshot";
import type { DraftTeamPlayerColorSlot } from "./player-colors";

const MAX_SUGGESTION_BOARDS = 5;
const MAX_HEROES_PER_SUGGESTION_BOARD = 5;

export type DraftHeroSuggestionBoard = {
  playerId: string;
  playerName: string;
  colorSlot: DraftTeamPlayerColorSlot;
  heroIds: number[];
};

export function buildDraftHeroSuggestionBoards(
  suggestions: readonly DraftHeroSuggestion[],
): DraftHeroSuggestionBoard[] {
  const boardsByPlayer = new Map<string, DraftHeroSuggestionBoard>();
  for (const suggestion of suggestions) {
    const board = boardsByPlayer.get(suggestion.playerId);
    if (board) {
      if (board.heroIds.length < MAX_HEROES_PER_SUGGESTION_BOARD) {
        board.heroIds.push(suggestion.heroId);
      }
      continue;
    }
    boardsByPlayer.set(suggestion.playerId, {
      playerId: suggestion.playerId,
      playerName: suggestion.playerName,
      colorSlot: suggestion.colorSlot,
      heroIds: [suggestion.heroId],
    });
  }
  return [...boardsByPlayer.values()]
    .sort((left, right) => left.colorSlot - right.colorSlot)
    .slice(0, MAX_SUGGESTION_BOARDS);
}
