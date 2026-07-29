"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { FiChevronLeft, FiChevronRight, FiEyeOff } from "react-icons/fi";
import type { SeasonRound } from "../model/season-types";
import type { TournamentTab } from "../model/types";

const scrollEdgeTolerance = 2;
const dragThreshold = 4;

type DragState = {
  pointerId: number;
  startX: number;
  startScrollLeft: number;
  hasMoved: boolean;
};

type SeasonRoundTabStripProps = {
  activeRoundNumber: number | null;
  activeTab: TournamentTab;
  isOrganizer: boolean;
  rounds: SeasonRound[];
  onOpenRound: (roundNumber: number) => void;
};

export function SeasonRoundTabStrip({
  activeRoundNumber,
  activeTab,
  isOrganizer,
  rounds,
  onOpenRound,
}: SeasonRoundTabStripProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const activeRoundRef = useRef<HTMLButtonElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const keepScrollPositionRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const updateScrollEdges = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;
    const maximumScrollLeft = scrollArea.scrollWidth - scrollArea.clientWidth;
    setCanScrollBack(scrollArea.scrollLeft > scrollEdgeTolerance);
    setCanScrollForward(
      maximumScrollLeft - scrollArea.scrollLeft > scrollEdgeTolerance,
    );
  }, []);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;
    updateScrollEdges();
    const observer = new ResizeObserver(updateScrollEdges);
    observer.observe(scrollArea);
    return () => observer.disconnect();
  }, [rounds.length, updateScrollEdges]);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    const activeRound = activeRoundRef.current;
    if (!scrollArea || !activeRound) return;
    if (keepScrollPositionRef.current) {
      keepScrollPositionRef.current = false;
      updateScrollEdges();
      return;
    }
    const centeredPosition =
      activeRound.offsetLeft -
      (scrollArea.clientWidth - activeRound.offsetWidth) / 2;
    scrollArea.scrollTo({ left: centeredPosition, behavior: "smooth" });
  }, [activeRoundNumber, activeTab, updateScrollEdges]);

  const openRoundWithoutScrolling = (roundNumber: number) => {
    if (activeTab !== "round" || activeRoundNumber !== roundNumber) {
      keepScrollPositionRef.current = true;
    }
    onOpenRound(roundNumber);
  };

  const scrollToEdge = (edge: "start" | "end") => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;
    scrollArea.scrollTo({
      left: edge === "start" ? 0 : scrollArea.scrollWidth,
      behavior: "smooth",
    });
  };

  const startDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || event.button !== 0) return;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: event.currentTarget.scrollLeft,
      hasMoved: false,
    };
  };

  const continueDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const movement = event.clientX - dragState.startX;
    if (Math.abs(movement) < dragThreshold) return;
    if (!dragState.hasMoved) {
      dragState.hasMoved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
    }
    event.currentTarget.scrollLeft = dragState.startScrollLeft - movement;
    event.preventDefault();
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    suppressClickRef.current = dragState.hasMoved;
    dragStateRef.current = null;
    setIsDragging(false);
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  return (
    <div className="season-round-navigation">
      <button
        className={`season-round-edge-button${canScrollBack ? "" : " is-hidden"}`}
        type="button"
        aria-label="В начало списка туров"
        aria-hidden={!canScrollBack}
        tabIndex={canScrollBack ? 0 : -1}
        onClick={() => scrollToEdge("start")}
      >
        <FiChevronLeft aria-hidden="true" />
      </button>
      <div
        className={`tournament-tabs-stages season-round-tabs${isDragging ? " is-dragging" : ""}`}
        ref={scrollAreaRef}
        role="group"
        aria-label="Туры сезона"
        onScroll={updateScrollEdges}
        onPointerDown={startDragging}
        onPointerMove={continueDragging}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onClickCapture={(event) => {
          if (!suppressClickRef.current) return;
          event.preventDefault();
          event.stopPropagation();
        }}
        onDragStart={(event) => event.preventDefault()}
      >
        {rounds.map((round) => {
          const isActive =
            activeTab === "round" &&
            activeRoundNumber === round.round_number;
          return (
            <button
              className={`${isActive ? "active" : ""}${
                !round.is_visible ? " season-round-hidden" : ""
              }`}
              key={round.id}
              ref={isActive ? activeRoundRef : undefined}
              onClick={() => openRoundWithoutScrolling(round.round_number)}
              role="tab"
              aria-selected={isActive}
              title={
                round.is_visible
                  ? round.name || `Тур ${round.round_number}`
                  : "Тур скрыт от обычных пользователей"
              }
            >
              {round.round_kind === "finals"
                ? "Финалы"
                : `Тур ${round.round_number}`}
              {!round.is_visible && isOrganizer && (
                <FiEyeOff aria-label="Скрыт" />
              )}
            </button>
          );
        })}
      </div>
      <button
        className={`season-round-edge-button${canScrollForward ? "" : " is-hidden"}`}
        type="button"
        aria-label="В конец списка туров"
        aria-hidden={!canScrollForward}
        tabIndex={canScrollForward ? 0 : -1}
        onClick={() => scrollToEdge("end")}
      >
        <FiChevronRight aria-hidden="true" />
      </button>
    </div>
  );
}
