"use client";

import { useEffect, useState } from "react";
import type { DraftMapSnapshot } from "../model/snapshot";
import { draftTimerSnapshot } from "../model/timer";

export function useDraftClock(
  map: DraftMapSnapshot,
  serverNow: string,
  currentActorReserveSeconds: number,
) {
  const [nowMs, setNowMs] = useState(() => Date.parse(serverNow));
  useEffect(() => {
    const clockOffset = Date.parse(serverNow) - Date.now();
    const timer = window.setInterval(
      () => setNowMs(Date.now() + clockOffset),
      200,
    );
    return () => window.clearInterval(timer);
  }, [serverNow, map.id, map.currentStep]);

  if (!map.stepStartedAt || map.baseDurationSeconds === null) return null;
  return draftTimerSnapshot(
    {
      stepStartedAt: map.stepStartedAt,
      baseDurationSeconds: map.baseDurationSeconds,
      reserveSeconds: currentActorReserveSeconds,
    },
    new Date(nowMs),
  );
}

export function formatDraftSeconds(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}
