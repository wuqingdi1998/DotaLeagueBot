import { useId } from "react";
import { FiExternalLink } from "react-icons/fi";
import type { StarRaceQuest } from "../model/star-race";

/** Match evidence opens above the cards without changing the screen height. */
export function StarRaceCompletionMatches({ wins }: { wins: NonNullable<StarRaceQuest["completion"]>["wins"] }) {
  const id = useId();
  if (!wins.length) return null;
  return (
    <>
      <button className="october-race-matches-button" type="button" popoverTarget={id}>
        Матчи: {wins.length}
      </button>
      <div className="october-race-matches-popover" id={id} popover="auto">
        <strong>Матчи, засчитанные в задании</strong>
        {wins.map((win) => (
          <a key={win.matchId} href={`https://www.opendota.com/matches/${win.matchId}`} target="_blank" rel="noreferrer">
            {win.hero.name} · матч {win.matchId} <FiExternalLink aria-hidden="true" />
          </a>
        ))}
      </div>
    </>
  );
}
