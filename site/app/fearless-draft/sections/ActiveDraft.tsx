"use client";

import { useState } from "react";
import {
  FiArrowRight,
  FiCheck,
  FiMaximize2,
  FiMinimize2,
  FiList,
} from "react-icons/fi";
import type {
  DraftPlayer,
  DraftSeriesSnapshot,
  FearlessDraftCommand,
} from "../model/snapshot";
import { formatDraftSeconds, useDraftClock } from "../hooks/useDraftClock";
import { useDraftFullscreen } from "../hooks/useDraftFullscreen";
import { DraftTeamPanel } from "../components/DraftTeamPanel";
import { HeroGrid } from "../components/HeroGrid";
import { DraftHistory } from "./DraftHistory";

const phaseLabels = {
  FIRST_BANS: "Первая стадия банов",
  FIRST_PICKS: "Первая стадия пиков",
  SECOND_BANS: "Вторая стадия банов",
  SECOND_PICKS: "Вторая стадия пиков",
  FINAL_BANS: "Финальная стадия банов",
  FINAL_PICKS: "Финальная стадия пиков",
} as const;

function otherPlayer(series: DraftSeriesSnapshot, playerId: string): DraftPlayer {
  return series.player1.id === playerId ? series.player2 : series.player1;
}

export function ActiveDraft({
  series,
  userId,
  serverNow,
  isSending,
  send,
}: {
  series: DraftSeriesSnapshot;
  userId: string;
  serverNow: string;
  isSending: boolean;
  send: (command: FearlessDraftCommand) => Promise<boolean>;
}) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { map } = series;
  const radiantPlayerId = map.radiantPlayerId ?? series.player1.id;
  const firstPickPlayerId = map.firstPickPlayerId ?? series.player1.id;
  const radiant = radiantPlayerId === series.player1.id
    ? series.player1
    : series.player2;
  const dire = otherPlayer(series, radiant.id);
  const firstPick = firstPickPlayerId === series.player1.id
    ? series.player1
    : series.player2;
  const currentActor = map.currentActorId
    ? map.currentActorId === series.player1.id ? series.player1 : series.player2
    : null;
  const storedCurrentReserve = currentActor?.id === series.player1.id
    ? map.player1ReserveSeconds
    : map.player2ReserveSeconds;
  const clock = useDraftClock(map, serverNow, storedCurrentReserve);
  const player1Reserve = currentActor?.id === series.player1.id && clock
    ? clock.reserveRemainingSeconds
    : map.player1ReserveSeconds;
  const player2Reserve = currentActor?.id === series.player2.id && clock
    ? clock.reserveRemainingSeconds
    : map.player2ReserveSeconds;
  const isComplete = map.status === "COMPLETE";
  const isOwnTurn = map.currentActorId === userId;
  const {
    draftRef,
    isFullscreen,
    isFullscreenSupported,
    toggleFullscreen,
  } = useDraftFullscreen();

  const ownReady = userId === series.player1.id
    ? series.player1ReadyForNextMap
    : series.player2ReadyForNextMap;
  const opponentReady = userId === series.player1.id
    ? series.player2ReadyForNextMap
    : series.player1ReadyForNextMap;

  return (
    <section className="fearless-active-draft" ref={draftRef}>
      <header className="fearless-draft-status">
        <div>
          <span>MAP {map.number} / {series.format}</span>
          <strong>{isComplete ? "DRAFT COMPLETE" : map.currentPhase ? phaseLabels[map.currentPhase] : "Драфт"}</strong>
        </div>
        {isComplete ? (
          <div className="fearless-map-ready-control">
            {series.status === "COMPLETE" ? (
              <button
                className="primary-button"
                type="button"
                disabled={isSending}
                onClick={() => void send({ action: "DISMISS_COMPLETE" })}
              >
                Вернуться к поиску <FiArrowRight />
              </button>
            ) : (
              <button
                className="primary-button"
                type="button"
                disabled={isSending || ownReady}
                onClick={() => void send({ action: "READY_FOR_NEXT_MAP" })}
              >
                {ownReady ? (
                  <><FiCheck /> Ожидаем соперника…</>
                ) : (
                  <>
                    {opponentReady && "Соперник готов · "}
                    Я готов к карте {map.number + 1} <FiArrowRight />
                  </>
                )}
              </button>
            )}
          </div>
        ) : currentActor && (
          <div className={`fearless-turn ${isOwnTurn ? "own" : "opponent"}`}>
            <span>{isOwnTurn ? "ВАШ ХОД" : `ХОД: ${currentActor.name}`}</span>
            <strong>{map.currentAction}</strong>
          </div>
        )}
        <div className="fearless-draft-view-controls">
          <div className={`fearless-main-clock ${clock?.isUsingReserve ? "reserve" : ""}`}>
            <span>{clock?.isUsingReserve ? "RESERVE TIME" : "ВРЕМЯ ХОДА"}</span>
            <strong>
              {isComplete
                ? "00:00"
                : clock
                  ? formatDraftSeconds(clock.isUsingReserve
                      ? clock.reserveRemainingSeconds
                      : clock.baseRemainingSeconds)
                  : "--:--"}
            </strong>
          </div>
          {isFullscreenSupported && (
            <button
              className="fearless-fullscreen-toggle"
              type="button"
              role="switch"
              aria-checked={isFullscreen}
              onClick={() => {
                setIsHistoryOpen(false);
                void toggleFullscreen();
              }}
            >
              {isFullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
              <span aria-hidden="true"><i /></span>
              <em>На полный экран</em>
            </button>
          )}
        </div>
      </header>

      <div className="fearless-team-columns">
        <DraftTeamPanel
          player={radiant}
          side="RADIANT"
          priority={firstPick.id === radiant.id ? "FIRST" : "SECOND"}
          actions={map.actions}
          currentStep={map.currentStep}
          previewHeroId={map.previewHeroId}
          reserveSeconds={radiant.id === series.player1.id ? player1Reserve : player2Reserve}
          isCurrent={map.currentActorId === radiant.id}
          isConnected={radiant.id === series.player1.id ? series.player1Connected : series.player2Connected}
        />
        <DraftTeamPanel
          player={dire}
          side="DIRE"
          priority={firstPick.id === dire.id ? "FIRST" : "SECOND"}
          actions={map.actions}
          currentStep={map.currentStep}
          previewHeroId={map.previewHeroId}
          reserveSeconds={dire.id === series.player1.id ? player1Reserve : player2Reserve}
          isCurrent={map.currentActorId === dire.id}
          isConnected={dire.id === series.player1.id ? series.player1Connected : series.player2Connected}
        />
      </div>

      <div className="fearless-draft-workspace">
        <HeroGrid map={map} userId={userId} isSending={isSending} send={send} />
        <button
          className="fearless-history-toggle"
          type="button"
          aria-controls="fearless-draft-history"
          aria-expanded={isHistoryOpen}
          onClick={() => setIsHistoryOpen((isOpen) => !isOpen)}
        >
          <FiList /> <span>История</span>
        </button>
        <DraftHistory
          actions={map.actions}
          isDrawerOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
        />
      </div>
    </section>
  );
}
