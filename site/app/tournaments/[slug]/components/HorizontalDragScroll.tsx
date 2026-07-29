"use client";

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

const dragThreshold = 4;

type DragState = {
  pointerId: number;
  startScrollLeft: number;
  startX: number;
  hasMoved: boolean;
};

export function HorizontalDragScroll({ children }: { children: ReactNode }) {
  const dragStateRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const startDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || event.button !== 0) return;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startScrollLeft: event.currentTarget.scrollLeft,
      startX: event.clientX,
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
    <div
      className={`season-table-scroll season-table-drag-scroll${
        isDragging ? " is-dragging" : ""
      }`}
      onPointerDown={startDragging}
      onPointerMove={continueDragging}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onPointerLeave={(event) => {
        if (dragStateRef.current?.hasMoved) return;
        if (dragStateRef.current?.pointerId === event.pointerId) {
          dragStateRef.current = null;
        }
      }}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onDragStart={(event) => event.preventDefault()}
    >
      {children}
    </div>
  );
}
