"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSiteRequest } from "@/lib/site-request";
import type { MatchRoomCommand, MatchRoomSnapshot } from "../model/types";

type ErrorResponse = { error?: string };

export function useMatchRoom(initialSnapshot: MatchRoomSnapshot) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const fallbackTimer = useRef<number | null>(null);
  const sending = useRef(false);
  const endpoint = `/api/match-room/${initialSnapshot.matchId}`;

  const reload = useCallback(async () => {
    const response = await fetchSiteRequest(endpoint, { cache: "no-store" });
    const body = (await response.json()) as MatchRoomSnapshot & ErrorResponse;
    if (!response.ok) throw new Error(body.error ?? "Не удалось обновить комнату");
    setSnapshot(body);
  }, [endpoint]);

  useEffect(() => {
    const events = new EventSource(`${endpoint}/events`);
    const receive = (event: MessageEvent<string>) => {
      try {
        setSnapshot(JSON.parse(event.data) as MatchRoomSnapshot);
        setError("");
        setIsConnected(true);
      } catch {
        setIsConnected(false);
      }
      if (fallbackTimer.current !== null) {
        window.clearInterval(fallbackTimer.current);
        fallbackTimer.current = null;
      }
    };
    events.addEventListener("snapshot", receive as EventListener);
    events.onopen = () => setIsConnected(true);
    events.onerror = () => {
      setIsConnected(false);
      if (fallbackTimer.current === null) {
        fallbackTimer.current = window.setInterval(() => void reload().catch(() => undefined), 3_000);
      }
    };
    return () => {
      events.close();
      if (fallbackTimer.current !== null) window.clearInterval(fallbackTimer.current);
    };
  }, [endpoint, reload]);

  const send = useCallback(async (command: MatchRoomCommand) => {
    if (sending.current) return false;
    sending.current = true;
    setIsSending(true);
    try {
      const response = await fetchSiteRequest(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(command),
      });
      const body = (await response.json()) as ErrorResponse;
      if (!response.ok) throw new Error(body.error ?? "Действие не выполнено");
      setError("");
      if (!isConnected) await reload();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Действие не выполнено");
      await reload().catch(() => undefined);
      return false;
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  }, [endpoint, isConnected, reload]);

  return { snapshot, error, isSending, isConnected, send };
}
