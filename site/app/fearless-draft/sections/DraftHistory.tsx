"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { DraftTree } from "../components/DraftTree";
import { FEARLESS_DRAFT_HEROES_BY_ID } from "../model/heroes";
import type { DraftActionSnapshot } from "../model/snapshot";
import { useDraftLocale } from "../hooks/useDraftLocale";

export function DraftHistory({
  actions,
  radiantPlayerId,
  firstPickPlayerId,
  currentStep,
  previewHeroId,
  isFullscreen,
}: {
  actions: DraftActionSnapshot[];
  radiantPlayerId: string;
  firstPickPlayerId: string;
  currentStep: number;
  previewHeroId: number | null;
  isFullscreen: boolean;
}) {
  const { text } = useDraftLocale();
  const historyListRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<"history" | "tree">("history");

  useEffect(() => {
    const historyList = historyListRef.current;
    if (!historyList) return;
    if (historyList.scrollHeight > historyList.clientHeight) {
      historyList.scrollTop = historyList.scrollHeight;
    }
  }, [actions.length]);

  return (
    <aside className="fearless-history" id="fearless-draft-history">
      <header>
        {isFullscreen ? (
          <nav className="fearless-history-tabs" aria-label={text.historyView} role="tablist">
            <button
              className={activeView === "history" ? "active" : ""}
              id="fearless-draft-history-tab"
              type="button"
              role="tab"
              aria-controls="fearless-draft-history-panel"
              aria-selected={activeView === "history"}
              onClick={() => setActiveView("history")}
            >
              {text.history}
            </button>
            <button
              className={activeView === "tree" ? "active" : ""}
              id="fearless-draft-tree-tab"
              type="button"
              role="tab"
              aria-controls="fearless-draft-tree-panel"
              aria-selected={activeView === "tree"}
              onClick={() => setActiveView("tree")}
            >
              {text.tree}
            </button>
          </nav>
        ) : (
          <>
            <span>{text.mapHistory}</span>
            <strong>{actions.length} / 24</strong>
          </>
        )}
      </header>
      {isFullscreen && activeView === "tree" ? (
        <DraftTree
          actions={actions}
          radiantPlayerId={radiantPlayerId}
          firstPickPlayerId={firstPickPlayerId}
          currentStep={currentStep}
          previewHeroId={previewHeroId}
        />
      ) : (
        <div
          ref={historyListRef}
          id="fearless-draft-history-panel"
          role={isFullscreen ? "tabpanel" : undefined}
          aria-labelledby={isFullscreen ? "fearless-draft-history-tab" : undefined}
        >
          {actions.map((action) => {
            const hero = action.heroId
              ? FEARLESS_DRAFT_HEROES_BY_ID.get(action.heroId)
              : null;
            return (
              <article key={action.step}>
                <b>{action.step + 1}</b>
                <span className={action.actorId === radiantPlayerId ? "radiant" : "dire"}>
                  {action.type === "BAN" ? text.ban : text.pick}
                </span>
                {hero ? (
                  <Image src={hero.imageUrl} alt="" width={44} height={25} unoptimized />
                ) : <i>—</i>}
                <strong>{hero?.name ?? text.skipped}</strong>
                {action.isAutomatic && <small>{text.automatic}</small>}
              </article>
            );
          })}
          {!actions.length && <p>{text.firstActionSoon}</p>}
        </div>
      )}
    </aside>
  );
}
