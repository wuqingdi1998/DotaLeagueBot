import type { CSSProperties } from "react";
import { coinTossAngleDegrees } from "../model/coin-toss";
import type { DraftPlayer } from "../model/snapshot";

export type CoinTossStage = "FLIPPING" | "SPINNING" | "REVEALED";

export function DraftCoinToss({
  leftPlayer,
  rightPlayer,
  winnerId,
  segment,
  stage,
}: {
  leftPlayer: DraftPlayer;
  rightPlayer: DraftPlayer;
  winnerId: string;
  segment: number;
  stage: CoinTossStage;
}) {
  if (stage === "FLIPPING") {
    return (
      <div className="fearless-coin flipping" aria-label="Монетка вращается">
        <div><span>LS</span></div>
      </div>
    );
  }

  const winnerSide = winnerId === leftPlayer.id ? "left" : "right";
  const spinnerStyle = {
    "--fearless-spinner-angle": `${2_880 + coinTossAngleDegrees(segment)}deg`,
  } as CSSProperties;
  return (
    <div className={`fearless-toss-wheel ${stage.toLowerCase()}`}>
      <div className="fearless-wheel-sectors">
        <span className="left">{leftPlayer.name}</span>
        <span className="right">{rightPlayer.name}</span>
      </div>
      <i
        className={`fearless-wheel-spinner winner-${winnerSide}`}
        style={spinnerStyle}
      >
        <b />
      </i>
      <i className="fearless-wheel-spinner-hub" aria-hidden="true" />
    </div>
  );
}
