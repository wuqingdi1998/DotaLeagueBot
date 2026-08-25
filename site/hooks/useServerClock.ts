"use client";

import { useEffect, useState } from "react";
import { serverTimeFromAnchor } from "@/lib/server-clock";

export function useServerClock(
  serverNow: string | null | undefined,
  updateIntervalMs = 1_000,
): number {
  const parsedServerNow = Date.parse(serverNow ?? "");
  const [nowMs, setNowMs] = useState(() => parsedServerNow);

  useEffect(() => {
    if (!serverNow || !Number.isFinite(parsedServerNow)) return;

    const monotonicAnchorMs = performance.now();
    const updateNow = () =>
      setNowMs(
        serverTimeFromAnchor(serverNow, monotonicAnchorMs, performance.now()),
      );
    const initialTimer = window.setTimeout(updateNow, 0);
    const timer = window.setInterval(updateNow, updateIntervalMs);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [parsedServerNow, serverNow, updateIntervalMs]);

  return Number.isFinite(parsedServerNow) ? nowMs : Number.NaN;
}
