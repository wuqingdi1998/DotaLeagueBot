"use client";

import { useEffect, useState } from "react";
import {
  applyServerClockOffset,
  serverClockOffsetMs,
} from "../model/server-clock";

export function useServerNow(
  serverNow: string,
  updateIntervalMs: number,
): number {
  const [nowMs, setNowMs] = useState(() => Date.parse(serverNow));

  useEffect(() => {
    const serverOffsetMs = serverClockOffsetMs(serverNow, Date.now());
    const updateNow = () => setNowMs(applyServerClockOffset(Date.now(), serverOffsetMs));
    updateNow();
    const interval = window.setInterval(updateNow, updateIntervalMs);
    return () => window.clearInterval(interval);
  }, [serverNow, updateIntervalMs]);

  return nowMs;
}
