import Image from "next/image";
import type { CSSProperties } from "react";
import { FiX } from "react-icons/fi";
import { FEARLESS_DRAFT_HEROES_BY_ID } from "../model/heroes";
import { draftTeamPlayerColor } from "../model/player-colors";
import type { DraftHeroSuggestion } from "../model/snapshot";
import { buildDraftHeroSuggestionBoards } from "../model/suggestion-boards";

type SuggestionBoardStyle = CSSProperties & {
  "--fearless-suggestion-player-color": string;
};

export function HeroSuggestionBoards({
  suggestions,
  label,
  removeLabel,
  userId,
  isSending,
  onRemoveOwnSuggestion,
}: {
  suggestions: readonly DraftHeroSuggestion[];
  label: string;
  removeLabel: string;
  userId: string;
  isSending: boolean;
  onRemoveOwnSuggestion: (heroId: number) => void;
}) {
  const boards = buildDraftHeroSuggestionBoards(suggestions);
  return (
    <div className="fearless-hero-suggestion-boards" aria-label={label}>
      {boards.map((board) => {
        const boardStyle: SuggestionBoardStyle = {
          "--fearless-suggestion-player-color": draftTeamPlayerColor(board.colorSlot),
        };
        return (
          <article key={board.playerId} style={boardStyle} aria-label={board.playerName}>
            {board.heroIds.flatMap((heroId) => {
              const hero = FEARLESS_DRAFT_HEROES_BY_ID.get(heroId);
              if (!hero) return [];
              const portrait = (
                <Image src={hero.portraitUrl} alt={hero.name} fill sizes="48px" unoptimized />
              );
              return board.playerId === userId ? [(
                <button
                  key={hero.id}
                  type="button"
                  disabled={isSending}
                  aria-label={`${removeLabel}: ${hero.name}`}
                  title={`${removeLabel}: ${hero.name}`}
                  onClick={() => onRemoveOwnSuggestion(hero.id)}
                >
                  {portrait}
                  <FiX aria-hidden="true" />
                </button>
              )] : [(
                <span key={hero.id} title={hero.name}>{portrait}</span>
              )];
            })}
          </article>
        );
      })}
    </div>
  );
}
