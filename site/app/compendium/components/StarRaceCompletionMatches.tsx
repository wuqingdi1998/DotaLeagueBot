import { useId } from "react";
import { FiExternalLink } from "react-icons/fi";
import type { StarRaceQuest } from "../model/star-race";

/** Match evidence opens above the cards without changing the screen height. */
export function StarRaceCompletionMatches({ wins, hasCompleteEvidence = true }: {
  wins: NonNullable<StarRaceQuest["completion"]>["wins"];
  hasCompleteEvidence?: boolean;
}) {
  const id = useId();
  if (!wins.length) return null;
  return (
    <>
      <button className="october-race-matches-button" type="button" popoverTarget={id}>
        Матчи: {wins.length}
      </button>
      <div className="october-race-matches-popover" id={id} popover="auto">
        <strong>Матчи, засчитанные в задании</strong>
        {!hasCompleteEvidence && <p>Список ещё восстанавливается из OpenDota. Сейчас показаны известные матчи; награда уже получена.</p>}
        {wins.map((win) => (
          <a key={win.matchId} href={`https://www.opendota.com/matches/${win.matchId}`} target="_blank" rel="noreferrer">
            {win.hero.name} · матч {win.matchId} <FiExternalLink aria-hidden="true" />
          </a>
        ))}
      </div>
    </>
  );
}
