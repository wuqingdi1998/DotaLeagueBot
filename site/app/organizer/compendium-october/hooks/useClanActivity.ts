"use client";

import { useEffect, useState } from "react";
import { CLAN_ACTIVITY_URL, type ClanDailyActivity } from "../model/clan-daily-activity";

export function useClanActivity(isOpen: boolean) {
  const [activity, setActivity] = useState<ClanDailyActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    let requestNumber = 0;
    let resetTimer: ReturnType<typeof setTimeout>;
    async function load() {
      const currentRequest = ++requestNumber;
      const requestedAt = performance.now();
      clearTimeout(resetTimer);
      setActivity(null);
      setError(null);
      try {
        const response = await fetch(CLAN_ACTIVITY_URL, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Не удалось загрузить активность. Попробуйте ещё раз.");
        const data: ClanDailyActivity = await response.json();
        if (controller.signal.aborted || currentRequest !== requestNumber) return;
        setActivity(data);
        if (data.isActive) {
          resetTimer = setTimeout(() => { void load(); },
            Math.max(0, Date.parse(data.resetsAt) - Date.parse(data.serverNow) - (performance.now() - requestedAt)));
        }
      } catch (failure) {
        if (!controller.signal.aborted && currentRequest === requestNumber) setError(failure instanceof Error ? failure.message : "Ошибка загрузки активности");
      }
    }
    function refreshAfterFocus() { clearTimeout(resetTimer); void load(); }
    function refreshAfterVisibility() { if (document.visibilityState === "visible") refreshAfterFocus(); }
    void load();
    window.addEventListener("focus", refreshAfterFocus);
    document.addEventListener("visibilitychange", refreshAfterVisibility);
    return () => {
      controller.abort();
      clearTimeout(resetTimer);
      window.removeEventListener("focus", refreshAfterFocus);
      document.removeEventListener("visibilitychange", refreshAfterVisibility);
    };
  }, [isOpen, reloadKey]);
  return { activity, error, retry: () => setReloadKey((key) => key + 1) };
}
