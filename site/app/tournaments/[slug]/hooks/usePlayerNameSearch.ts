"use client";

import { useCallback, useEffect, useState } from "react";

const minimumPlayerSearchLength = 2;

export function usePlayerNameSearch(isEnabled: boolean) {
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!isEnabled || normalizedQuery.length < minimumPlayerSearchLength) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/players?q=${encodeURIComponent(normalizedQuery)}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) {
          setPlayerNames([]);
          return;
        }
        const result = (await response.json()) as {
          players: Array<{ ingame_name: string }>;
        };
        setPlayerNames(
          result.players.map((player) => player.ingame_name),
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError") setPlayerNames([]);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isEnabled, query]);

  const searchPlayerNames = useCallback((nextQuery: string) => {
    setQuery(nextQuery);
    if (nextQuery.trim().length < minimumPlayerSearchLength) {
      setPlayerNames([]);
    }
  }, []);

  return { playerNames, searchPlayerNames };
}
