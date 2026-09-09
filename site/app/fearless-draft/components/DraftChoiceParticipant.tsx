import type { DraftPlayer } from "../model/snapshot";
import { PlayerAvatar } from "./PlayerAvatar";

export function DraftChoiceParticipant({
  player,
  orderLabel,
  statusLabel,
  choiceLabel,
  alignment,
  isActive,
}: {
  player: DraftPlayer;
  orderLabel: string;
  statusLabel: string;
  choiceLabel: string | null;
  alignment: "left" | "right";
  isActive: boolean;
}) {
  return (
    <article
      className={`fearless-choice-participant ${alignment} ${isActive ? "active" : ""}`}
    >
      <PlayerAvatar player={player} freezeAnimation />
      <div>
        <span>{orderLabel}</span>
        <strong>{player.name}</strong>
        <small className={choiceLabel ? "chosen" : undefined}>
          {choiceLabel ?? statusLabel}
        </small>
      </div>
    </article>
  );
}
