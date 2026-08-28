"use client";

import { useState, type ReactNode } from "react";
import { FiArrowRight, FiCheck } from "react-icons/fi";
import type {
  DraftPlayer,
  DraftLobbyPlayer,
  DraftSeriesSnapshot,
  FearlessDraftCommand,
} from "../model/snapshot";
import { formatDraftSeconds, useDraftClock } from "../hooks/useDraftClock";
import { DraftFullscreenToggle } from "../components/DraftFullscreenToggle";
import { DraftTeamPanel } from "../components/DraftTeamPanel";
import { HeroGrid } from "../components/HeroGrid";
import { DraftHistory } from "./DraftHistory";
import { useDraftLocale } from "../hooks/useDraftLocale";
import { draftLobbyTeamForCaptain } from "../model/lobby-roster";

function otherPlayer(series: DraftSeriesSnapshot, playerId: string): DraftPlayer {
  return series.player1.id === playerId ? series.player2 : series.player1;
}

export function ActiveDraft({
  series,
  userId,
  serverNow,
  isSending,
  send,
  isFullscreen,
  isFullscreenSupported,
  toggleFullscreen,
  canControlSeries,
  lobbyPlayers,
}: {
  series: DraftSeriesSnapshot;
  userId: string;
  serverNow: string;
  isSending: boolean;
  send: (command: FearlessDraftCommand) => Promise<boolean>;
  isFullscreen: boolean;
  isFullscreenSupported: boolean;
  toggleFullscreen: () => Promise<void>;
  canControlSeries: boolean;
  lobbyPlayers?: DraftLobbyPlayer[];
}) {
  const { text } = useDraftLocale();
  const [localPreview, setLocalPreview] = useState<{
    heroId: number;
    version: number;
  } | null>(null);
  const { map } = series;
  const localPreviewHeroId = localPreview?.version === map.version
    ? localPreview.heroId
    : null;
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
  const ownReady = userId === series.player1.id
    ? series.player1ReadyForNextMap
    : series.player2ReadyForNextMap;
  const opponentReady = userId === series.player1.id
    ? series.player2ReadyForNextMap
    : series.player1ReadyForNextMap;
  const radiantReserve = radiant.id === series.player1.id
    ? player1Reserve
    : player2Reserve;
  const direReserve = dire.id === series.player1.id
    ? player1Reserve
    : player2Reserve;
  const hasLobbyPlayers = Boolean(lobbyPlayers?.length);
  const phaseLabels = {
    FIRST_BANS: text.firstBans,
    FIRST_PICKS: text.firstPicks,
    SECOND_BANS: text.secondBans,
    SECOND_PICKS: text.secondPicks,
    FINAL_BANS: text.finalBans,
    FINAL_PICKS: text.finalPicks,
  } as const;
  let turnControl: ReactNode = null;

  if (isComplete && canControlSeries) {
    turnControl = (
      <div className="fearless-map-ready-control">
        {series.status === "COMPLETE" ? (
          <button
            className="primary-button"
            type="button"
            disabled={isSending}
            onClick={() => void send({ action: "DISMISS_COMPLETE" })}
          >
            {text.returnToQueue} <FiArrowRight />
          </button>
        ) : (
          <button
            className="primary-button"
            type="button"
            disabled={isSending || ownReady}
            onClick={() => void send({ action: "READY_FOR_NEXT_MAP" })}
          >
            {ownReady ? (
              <><FiCheck /> {text.waitingOpponent}</>
            ) : (
              <>
                {opponentReady && text.opponentReady}
                {text.readyForMap} {map.number + 1} <FiArrowRight />
              </>
            )}
          </button>
        )}
      </div>
    );
  } else if (currentActor) {
    turnControl = (
      <div className={`fearless-turn ${isOwnTurn ? "own" : "opponent"}`}>
        <span>{isOwnTurn ? text.yourTurn : `${text.turn}: ${currentActor.name}`}</span>
        <strong>{map.currentAction === "BAN" ? text.ban : text.pick}</strong>
      </div>
    );
  }

  return (
    <section className="fearless-active-draft">
      <header className={`fearless-draft-status ${hasLobbyPlayers ? "has-lobby-players" : ""}`}>
        <div>
          <span>{text.map} {map.number} / {series.format}</span>
          <strong>{isComplete ? text.draftComplete : map.currentPhase ? phaseLabels[map.currentPhase] : text.draft}</strong>
        </div>
        {hasLobbyPlayers ? (
          <div className="fearless-lobby-turn-group">
            <div className="fearless-lobby-side-status radiant">
              <strong>{text.radiant} · {firstPick.id === radiant.id ? text.firstPick : text.secondPick}</strong>
              <span>{text.reserve} <b>{Math.ceil(radiantReserve)}{text.secondsShort}</b></span>
            </div>
            {turnControl ?? <div className="fearless-lobby-turn-placeholder" aria-hidden="true" />}
            <div className="fearless-lobby-side-status dire">
              <strong>{text.dire} · {firstPick.id === dire.id ? text.firstPick : text.secondPick}</strong>
              <span>{text.reserve} <b>{Math.ceil(direReserve)}{text.secondsShort}</b></span>
            </div>
          </div>
        ) : turnControl}
        <div className="fearless-draft-view-controls">
          <div className={`fearless-main-clock ${clock?.isUsingReserve ? "reserve" : ""}`}>
            <span>{clock?.isUsingReserve ? text.reserveTime : text.turnTime}</span>
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
          <DraftFullscreenToggle
            isFullscreen={isFullscreen}
            isFullscreenSupported={isFullscreenSupported}
            toggleFullscreen={toggleFullscreen}
          />
        </div>
      </header>

      <div className="fearless-team-columns">
        <DraftTeamPanel
          player={radiant}
          side="RADIANT"
          priority={firstPick.id === radiant.id ? "FIRST" : "SECOND"}
          actions={map.actions}
          currentStep={map.currentStep}
          previewHeroId={localPreviewHeroId}
          reserveSeconds={radiantReserve}
          isCurrent={map.currentActorId === radiant.id}
          isConnected={radiant.id === series.player1.id ? series.player1Connected : series.player2Connected}
          teamPlayers={lobbyPlayers ? draftLobbyTeamForCaptain(lobbyPlayers, radiant.id) : undefined}
        />
        <DraftTeamPanel
          player={dire}
          side="DIRE"
          priority={firstPick.id === dire.id ? "FIRST" : "SECOND"}
          actions={map.actions}
          currentStep={map.currentStep}
          previewHeroId={localPreviewHeroId}
          reserveSeconds={direReserve}
          isCurrent={map.currentActorId === dire.id}
          isConnected={dire.id === series.player1.id ? series.player1Connected : series.player2Connected}
          teamPlayers={lobbyPlayers ? draftLobbyTeamForCaptain(lobbyPlayers, dire.id) : undefined}
        />
      </div>

      <div className="fearless-draft-workspace">
        <HeroGrid
          map={map}
          userId={userId}
          isSending={isSending}
          send={send}
          onPreviewHeroIdChange={(heroId) => setLocalPreview({
            heroId,
            version: map.version,
          })}
        />
        <DraftHistory
          actions={map.actions}
          radiantPlayerId={radiant.id}
          firstPickPlayerId={firstPick.id}
          currentStep={map.currentStep}
          previewHeroId={localPreviewHeroId}
        />
      </div>
    </section>
  );
}
