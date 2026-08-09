"use client";

import { useEffect, useState } from "react";
import { serverTimeFromAnchor } from "../model/time";

export function useServerClock(serverNow: string): number {
  const [nowMs, setNowMs] = useState(() => Date.parse(serverNow));

  useEffect(() => {
    const monotonicAnchorMs = performance.now();
    const timer = window.setInterval(() => {
      setNowMs(
        serverTimeFromAnchor(serverNow, monotonicAnchorMs, performance.now()),
      );
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [serverNow]);

  return nowMs;
}
