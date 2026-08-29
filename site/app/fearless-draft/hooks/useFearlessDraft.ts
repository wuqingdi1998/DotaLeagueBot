"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  FearlessDraftCommand,
  FearlessDraftSnapshot,
} from "../model/snapshot";

type CommandResponse = { error?: string };

export function useFearlessDraft(
  initialSnapshot: FearlessDraftSnapshot,
  seasonMatchId?: number,
) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const fallbackTimer = useRef<number | null>(null);

  const reload = useCallback(async () => {
    const suffix = seasonMatchId ? `?seasonMatchId=${seasonMatchId}` : "";
    const response = await fetch(`/api/fearless-draft${suffix}`, {
      cache: "no-store",
    });
    const body = (await response.json()) as FearlessDraftSnapshot & CommandResponse;
    if (!response.ok) throw new Error(body.error ?? "Не удалось обновить драфт");
    setSnapshot(body);
  }, [seasonMatchId]);

  useEffect(() => {
    const suffix = seasonMatchId ? `?seasonMatchId=${seasonMatchId}` : "";
    const events = new EventSource(`/api/fearless-draft/events${suffix}`);
    const receiveSnapshot = (event: MessageEvent<string>) => {
      setSnapshot(JSON.parse(event.data) as FearlessDraftSnapshot);
      setIsConnected(true);
      setError("");
      if (fallbackTimer.current !== null) {
        window.clearInterval(fallbackTimer.current);
        fallbackTimer.current = null;
      }
    };
    events.addEventListener("snapshot", receiveSnapshot as EventListener);
    events.onopen = () => setIsConnected(true);
    events.onerror = () => {
      setIsConnected(false);
      if (fallbackTimer.current === null) {
        fallbackTimer.current = window.setInterval(() => {
          void reload().catch(() => undefined);
        }, 3_000);
      }
    };
    return () => {
      events.close();
      if (fallbackTimer.current !== null) {
        window.clearInterval(fallbackTimer.current);
        fallbackTimer.current = null;
      }
    };
  }, [reload, seasonMatchId]);

  const send = useCallback(async (command: FearlessDraftCommand) => {
    setIsSending(true);
    try {
      const suffix = seasonMatchId ? `?seasonMatchId=${seasonMatchId}` : "";
      const response = await fetch(`/api/fearless-draft${suffix}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(command),
      });
      const body = (await response.json()) as CommandResponse;
      if (!response.ok) throw new Error(body.error ?? "Действие не выполнено");
      setError("");
      await reload();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Действие не выполнено");
      await reload().catch(() => undefined);
      return false;
    } finally {
      setIsSending(false);
    }
  }, [reload, seasonMatchId]);

  return { snapshot, error, isSending, isConnected, send };
}
