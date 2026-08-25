"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  SeasonLobbyRoomCommand,
  SeasonLobbyRoomSnapshot,
} from "../model/types";

type ErrorResponse = { error?: string };

export function useSeasonLobbyRoom(initialSnapshot: SeasonLobbyRoomSnapshot) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const fallbackTimer = useRef<number | null>(null);
  const endpoint = `/api/season/lobby-room/${initialSnapshot.matchId}`;

  const reload = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store" });
    const body = (await response.json()) as SeasonLobbyRoomSnapshot & ErrorResponse;
    if (!response.ok) {
      throw new Error(body.error ?? "Не удалось обновить комнату");
    }
    setSnapshot(body);
  }, [endpoint]);

  useEffect(() => {
    const events = new EventSource(`${endpoint}/events`);
    const receiveSnapshot = (event: MessageEvent<string>) => {
      setSnapshot(JSON.parse(event.data) as SeasonLobbyRoomSnapshot);
      setError("");
      setIsConnected(true);
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
  }, [endpoint, reload]);

  const send = useCallback(async (command: SeasonLobbyRoomCommand) => {
    setIsSending(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(command),
      });
      const body = (await response.json()) as ErrorResponse;
      if (!response.ok) {
        throw new Error(body.error ?? "Действие не выполнено");
      }
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
  }, [endpoint, reload]);

  return { snapshot, error, isSending, isConnected, send };
}
