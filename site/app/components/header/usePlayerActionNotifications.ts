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
};

function lastOpenedStorageKey(playerId: string): string {
  return `player-action-notification:last-opened:${playerId}`;
}

export function usePlayerActionNotifications(playerId: string) {
  const [notifications, setNotifications] = useState<
    PlayerActionNotification[]
  >([]);
  const [lastOpenedId, setLastOpenedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/player-actions", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const result = (await response.json()) as PlayerActionResponse;
      setNotifications(result.notifications);
    } catch {
      // A temporary network failure must not interrupt the rest of the header.
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLastOpenedId(
        window.sessionStorage.getItem(lastOpenedStorageKey(playerId)),
      );
      void refresh();
    }, 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, refreshIntervalMilliseconds);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener(
      playerActionNotificationsRefreshEvent,
      refreshWhenVisible,
    );
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
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

  const currentNotification = nextPlayerActionNotification(
    notifications,
    lastOpenedId,
  );

  function markCurrentAsOpened(): PlayerActionNotification | null {
    if (!currentNotification) return null;
    window.sessionStorage.setItem(
      lastOpenedStorageKey(playerId),
      currentNotification.id,
    );
    setLastOpenedId(currentNotification.id);
    return currentNotification;
  }

  return { currentNotification, markCurrentAsOpened };
}
