"use client";

import { useEffect } from "react";

/** Brings newly expanded draft stages fully into view after they render. */
export function useDraftStageScroll(stageKey: string | null) {
  useEffect(() => {
    if (!stageKey) return;
    const animationFrame = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [stageKey]);
}
