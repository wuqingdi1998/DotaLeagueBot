"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDraftPlayerStatistics } from "../hooks/useDraftPlayerStatistics";
import type { DraftLobbyPlayer, DraftPlayer } from "../model/snapshot";
import { PlayerAvatar } from "./PlayerAvatar";

const POPOVER_WIDTH = 390;
const POPOVER_HEIGHT = 204;
const VIEWPORT_GAP = 8;

function avatarPlayer(player: DraftLobbyPlayer): DraftPlayer {
  return {
    id: player.id,
    name: player.serverName ?? player.name,
    discordName: player.name,
    avatarUrl: player.avatarUrl,
  };
}

export function DraftPlayerStatisticsPopover({
  player,
}: {
  player: DraftLobbyPlayer;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const popoverId = useId();
  const { statistics, isLoading, error, loadStatistics } =
    useDraftPlayerStatistics(player.dotaId);
  const displayedName = player.serverName ?? player.name;

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const anchorBounds = anchor.getBoundingClientRect();
    const availableWidth = Math.max(0, window.innerWidth - VIEWPORT_GAP * 2);
    const popoverWidth = Math.min(POPOVER_WIDTH, availableWidth);
    const centeredLeft = anchorBounds.left + anchorBounds.width / 2 - popoverWidth / 2;
    const left = Math.min(
      Math.max(VIEWPORT_GAP, centeredLeft),
      window.innerWidth - popoverWidth - VIEWPORT_GAP,
    );
    const belowTop = anchorBounds.bottom + VIEWPORT_GAP;
    const top = belowTop + POPOVER_HEIGHT <= window.innerHeight - VIEWPORT_GAP
      ? belowTop
      : Math.max(VIEWPORT_GAP, anchorBounds.top - POPOVER_HEIGHT - VIEWPORT_GAP);
    setPosition({ left, top });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  function showStatistics() {
    const anchor = anchorRef.current;
    if (!anchor) return;
    updatePosition();
    setPortalTarget(
      anchor.closest<HTMLElement>(".fearless-draft-stage") ?? document.body,
    );
    setIsOpen(true);
    loadStatistics();
  }

  function hideStatistics() {
    setIsOpen(false);
  }

  const statisticCards = statistics ? [
    ["Турниров", statistics.tournaments],
    ["Побед в турнирах", statistics.tournamentWins],
    ["Призовых мест", statistics.podiums],
    ["Карт", statistics.maps],
    ["Побед на картах", statistics.mapWins],
    ["Победный процент", `${statistics.winRate}%`],
  ] as const : [];
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className="fearless-lobby-player-avatar"
        aria-label={`Статистика игрока ${displayedName}`}
        aria-describedby={isOpen ? popoverId : undefined}
        aria-expanded={isOpen}
        onMouseEnter={showStatistics}
        onMouseLeave={hideStatistics}
        onFocus={showStatistics}
        onBlur={hideStatistics}
        onClick={() => isOpen ? hideStatistics() : showStatistics()}
      >
        <PlayerAvatar player={avatarPlayer(player)} freezeAnimation />
        <i
          className={`fearless-lobby-player-presence ${player.isOnline ? "online" : "offline"}`}
          aria-label={player.isOnline ? "Игрок в сети" : "Игрок не в сети"}
          title={player.isOnline ? "Игрок в сети" : "Игрок не в сети"}
        />
      </button>
      {isOpen && portalTarget && createPortal(
        <aside
          id={popoverId}
          className="fearless-lobby-statistics-popover"
          style={position}
          role="tooltip"
        >
          <header>
            <strong>{displayedName}</strong>
            <span>Статистика на сервере</span>
          </header>
          {statistics ? (
            <div className="fearless-lobby-statistics-grid">
              {statisticCards.map(([label, value]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
          ) : (
            <p className={error ? "error" : undefined}>
              {error ?? (isLoading ? "Загружаю статистику…" : "Наводите ещё раз для загрузки")}
            </p>
          )}
        </aside>,
        portalTarget,
      )}
    </>
  );
}
