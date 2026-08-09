"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useDraftFullscreen() {
  const draftRef = useRef<HTMLElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullscreenSupported, setIsFullscreenSupported] = useState(false);

  useEffect(() => {
    const supportTimer = window.setTimeout(() => {
      setIsFullscreenSupported(
        "fullscreenEnabled" in document && document.fullscreenEnabled,
      );
    }, 0);
    const updateFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === draftRef.current);
    };
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => {
      window.clearTimeout(supportTimer);
      document.removeEventListener("fullscreenchange", updateFullscreenState);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!draftRef.current || !document.fullscreenEnabled) return;
    try {
      if (document.fullscreenElement === draftRef.current) {
        await document.exitFullscreen();
        return;
      }
      await draftRef.current.requestFullscreen();
    } catch {
      setIsFullscreen(false);
    }
  }, []);

  return {
    draftRef,
    isFullscreen,
    isFullscreenSupported,
    toggleFullscreen,
  };
}
