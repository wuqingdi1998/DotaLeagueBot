"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePlayerStatistics } from "@/app/hooks/usePlayerStatistics";

const POPOVER_WIDTH = 390;
const POPOVER_HEIGHT = 330;
const VIEWPORT_GAP = 8;

export function PlayerStatisticsPopover({
  anchorClassName,
  children,
  dotaId,
  nickname,
  portalContainerSelector,
  profileHref,
}: {
  anchorClassName: string;
  children: ReactNode;
  dotaId: string;
  nickname: string;
  portalContainerSelector?: string;
  profileHref?: string;
}) {
  const anchorRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const popoverId = useId();
  const { statistics, isLoading, error, loadStatistics } =
    usePlayerStatistics(dotaId);

  const setAnchor = useCallback(
    (node: HTMLAnchorElement | HTMLButtonElement | null) => {
      anchorRef.current = node;
    },
    [],
  );
  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const bounds = anchor.getBoundingClientRect();
    const availableWidth = Math.max(0, window.innerWidth - VIEWPORT_GAP * 2);
    const width = Math.min(POPOVER_WIDTH, availableWidth);
    const centeredLeft = bounds.left + bounds.width / 2 - width / 2;
    const left = Math.min(
      Math.max(VIEWPORT_GAP, centeredLeft),
      window.innerWidth - width - VIEWPORT_GAP,
    );
    const belowTop = bounds.bottom + VIEWPORT_GAP;
    const top = belowTop + POPOVER_HEIGHT <= window.innerHeight - VIEWPORT_GAP
      ? belowTop
      : Math.max(VIEWPORT_GAP, bounds.top - POPOVER_HEIGHT - VIEWPORT_GAP);
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
      (portalContainerSelector
        ? anchor.closest<HTMLElement>(portalContainerSelector)
        : null) ?? document.body,
    );
    setIsOpen(true);
    loadStatistics();
  }

  const anchorProps = {
    "aria-describedby": isOpen ? popoverId : undefined,
    "aria-expanded": isOpen,
    "aria-label": profileHref
      ? `Открыть профиль игрока ${nickname}`
      : `Статистика игрока ${nickname}`,
    className: anchorClassName,
    onBlur: () => setIsOpen(false),
    onFocus: showStatistics,
    onMouseEnter: showStatistics,
    onMouseLeave: () => setIsOpen(false),
    ref: setAnchor,
    title: profileHref ? `Открыть профиль игрока ${nickname}` : undefined,
  };
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
      {profileHref ? (
        <Link {...anchorProps} href={profileHref}>{children}</Link>
      ) : (
        <button
          {...anchorProps}
          type="button"
          onClick={() => setIsOpen((current) => !current)}
        >
          {children}
        </button>
      )}
      {isOpen && portalTarget && createPortal(
        <aside
          id={popoverId}
          className="player-statistics-popover"
          style={position}
          role="tooltip"
        >
          <header>
            <strong>{nickname}</strong>
            <span>Статистика на сервере</span>
          </header>
          {statistics ? (
            <div className="player-statistics-grid">
              {statisticCards.map(([label, value]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
          ) : (
            <p className={error ? "error" : undefined}>
              {error ?? (isLoading
                ? "Загружаю статистику…"
                : "Наведите ещё раз для загрузки")}
            </p>
          )}
        </aside>,
        portalTarget,
      )}
    </>
  );
}
