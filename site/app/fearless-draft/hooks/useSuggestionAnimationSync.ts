"use client";

import { useEffect, useRef, type RefObject } from "react";
import { draftSuggestionAnimationFrame } from "../model/suggestion-animation";

const SERVER_CLOCK_CORRECTION_RATE = 0.025;

/** Keeps every suggestion frame on one server-based phase without restarting CSS animations. */
export function useSuggestionAnimationSync(
  serverNow: string,
  isActive: boolean,
): RefObject<HTMLElement | null> {
  const animationRootRef = useRef<HTMLElement | null>(null);
  const currentServerOffsetMs = useRef<number | null>(null);
  const targetServerOffsetMs = useRef<number | null>(null);

  useEffect(() => {
    const observedOffsetMs = Date.parse(serverNow) - performance.now();
    targetServerOffsetMs.current = observedOffsetMs;
    currentServerOffsetMs.current ??= observedOffsetMs;
  }, [serverNow]);

  useEffect(() => {
    if (!isActive) return;
    let animationFrameId = 0;
    const updateAnimation = (performanceNowMs: number) => {
      const targetOffsetMs = targetServerOffsetMs.current;
      let currentOffsetMs = currentServerOffsetMs.current;
      if (targetOffsetMs !== null) {
        currentOffsetMs ??= targetOffsetMs;
        currentOffsetMs += (
          targetOffsetMs - currentOffsetMs
        ) * SERVER_CLOCK_CORRECTION_RATE;
        currentServerOffsetMs.current = currentOffsetMs;

        const frame = draftSuggestionAnimationFrame(
          performanceNowMs + currentOffsetMs,
        );
        const root = animationRootRef.current;
        root?.style.setProperty(
          "--fearless-suggestion-dash-travel",
          frame.dashTravel.toFixed(4),
        );
        root?.style.setProperty(
          "--fearless-suggestion-opacity",
          frame.opacity.toFixed(4),
        );
        root?.style.setProperty(
          "--fearless-suggestion-glow-radius",
          `${frame.glowRadius.toFixed(3)}px`,
        );
      }
      animationFrameId = window.requestAnimationFrame(updateAnimation);
    };
    animationFrameId = window.requestAnimationFrame(updateAnimation);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [isActive]);

  return animationRootRef;
}
