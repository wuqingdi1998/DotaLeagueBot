"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  draftSuggestionAnimationFrame,
  stableServerClockOffset,
} from "../model/suggestion-animation";

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
    targetServerOffsetMs.current = stableServerClockOffset(
      targetServerOffsetMs.current,
      observedOffsetMs,
    );
    currentServerOffsetMs.current ??= targetServerOffsetMs.current;
  }, [serverNow]);

  useEffect(() => {
    if (!isActive) return;
    let animationFrameId = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
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
        root?.querySelectorAll<SVGRectElement>(
          "[data-fearless-suggestion-dash-start]",
        ).forEach((dash) => {
          const dashStart = Number(
            dash.dataset.fearlessSuggestionDashStart ?? "0",
          );
          const dashTravel = reducedMotion.matches ? 0 : frame.dashTravel;
          dash.style.strokeDashoffset = (dashStart - dashTravel).toFixed(4);
        });
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
