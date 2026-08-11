"use client";

import { useEffect, useState } from "react";
import { serverNowAfterElapsed } from "../model/server-clock";

export function useServerNow(
  serverNow: string,
  updateIntervalMs: number,
): number {
  const [nowMs, setNowMs] = useState(() => Date.parse(serverNow));

  useEffect(() => {
    const receivedAtMs = performance.now();
    const updateNow = () => setNowMs(serverNowAfterElapsed(
      serverNow,
      performance.now() - receivedAtMs,
    ));
    updateNow();
    const interval = window.setInterval(updateNow, updateIntervalMs);
    return () => window.clearInterval(interval);
  }, [serverNow, updateIntervalMs]);

  return nowMs;
}
