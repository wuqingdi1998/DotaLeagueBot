"use client";

import { useCallback, useEffect, useState } from "react";
import {
  nextPlayerActionNotification,
  type PlayerActionNotification,
} from "@/lib/player-action-notifications";
import { playerActionNotificationsRefreshEvent } from "@/lib/player-action-notification-events";

const refreshIntervalMilliseconds = 30_000;

type PlayerActionResponse = {
  notifications: PlayerActionNotification[];
  activeSeasonLobbyMatchId: number | null;
};

function lastOpenedStorageKey(playerId: string): string {
  return `player-action-notification:last-opened:${playerId}`;
}

export function usePlayerActionNotifications(playerId: string | null) {
  const [data, setData] = useState<(PlayerActionResponse & { playerId: string }) | null>(null);
  const [lastOpenedId, setLastOpenedId] = useState<string | null>(null);

  const refresh = useCallback(async (signal: AbortSignal) => {
    if (!playerId) return;
    try {
      const response = await fetch("/api/player-actions", {
        cache: "no-store",
        signal,
      });
      if (!response.ok) return;
      const result = (await response.json()) as PlayerActionResponse;
      if (!signal.aborted) setData({ ...result, playerId });
    } catch {
      // A temporary network failure must not interrupt the rest of the header.
    }
  }, [playerId]);

  useEffect(() => {
    if (!playerId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLastOpenedId(
        window.sessionStorage.getItem(lastOpenedStorageKey(playerId)),
      );
      void refresh(controller.signal);
    }, 0);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh(controller.signal);
    };
    const interval = window.setInterval(refreshWhenVisible, refreshIntervalMilliseconds);
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener(
      playerActionNotificationsRefreshEvent,
      refreshWhenVisible,
    );
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener(
        playerActionNotificationsRefreshEvent,
        refreshWhenVisible,
      );
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [playerId, refresh]);

  const playerData = data?.playerId === playerId ? data : null;
  const currentNotification = nextPlayerActionNotification(
    playerData?.notifications ?? [],
    lastOpenedId,
  );

  function markCurrentAsOpened(): PlayerActionNotification | null {
    if (!playerId || !currentNotification) return null;
    window.sessionStorage.setItem(
      lastOpenedStorageKey(playerId),
      currentNotification.id,
    );
    setLastOpenedId(currentNotification.id);
    return currentNotification;
  }

  return {
    currentNotification,
    markCurrentAsOpened,
    activeSeasonLobbyMatchId: playerData?.activeSeasonLobbyMatchId ?? null,
  };
}
