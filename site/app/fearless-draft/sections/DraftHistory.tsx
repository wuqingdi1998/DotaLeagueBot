"use client";

import { DraftTree } from "../components/DraftTree";
import { formatDraftSeconds } from "../hooks/useDraftClock";
import type { DraftActionSnapshot } from "../model/snapshot";
import { useDraftLocale } from "../hooks/useDraftLocale";

export function DraftHistory({
  actions,
  radiantPlayerId,
  firstPickPlayerId,
  currentStep,
  previewHeroId,
  displayedClockSeconds,
  isUsingReserve,
  isComplete,
}: {
  actions: DraftActionSnapshot[];
  radiantPlayerId: string;
  firstPickPlayerId: string;
  currentStep: number;
  previewHeroId: number | null;
  displayedClockSeconds: number | null;
  isUsingReserve: boolean;
  isComplete: boolean;
}) {
  const { text } = useDraftLocale();

  return (
    <aside className="fearless-history" id="fearless-draft-history">
      <header>
        <div className={`fearless-main-clock ${isUsingReserve ? "reserve" : ""}`}>
          <span>{isUsingReserve ? text.reserveTime : text.turnTime}</span>
          <strong>
            {isComplete
              ? "00:00"
              : displayedClockSeconds !== null
                ? formatDraftSeconds(displayedClockSeconds)
                : "--:--"}
          </strong>
        </div>
      </header>
      <DraftTree
        actions={actions}
        radiantPlayerId={radiantPlayerId}
        firstPickPlayerId={firstPickPlayerId}
        currentStep={currentStep}
        previewHeroId={previewHeroId}
      />
    </aside>
  );
}
