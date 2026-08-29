import Image from "next/image";
import type { CSSProperties } from "react";
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
}: {
  suggestions: readonly DraftHeroSuggestion[];
  label: string;
}) {
  const boards = buildDraftHeroSuggestionBoards(suggestions);
  return (
    <div className="fearless-hero-suggestion-boards" aria-label={label}>
      {boards.map((board) => {
        const boardStyle: SuggestionBoardStyle = {
          "--fearless-suggestion-player-color": draftTeamPlayerColor(board.colorSlot),
        };
        return (
          <article key={board.playerId} style={boardStyle}>
            <strong title={board.playerName}>{board.playerName}</strong>
            <div>
              {board.heroIds.flatMap((heroId) => {
                const hero = FEARLESS_DRAFT_HEROES_BY_ID.get(heroId);
                return hero ? [(
                  <span key={hero.id} title={hero.name}>
                    <Image src={hero.portraitUrl} alt={hero.name} fill sizes="28px" unoptimized />
                  </span>
                )] : [];
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
