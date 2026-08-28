"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadDraftPlayerStatistics,
  type DraftPlayerStatistics,
} from "../services/player-statistics";

export function useDraftPlayerStatistics(dotaId: string) {
  const [statistics, setStatistics] = useState<DraftPlayerStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<Promise<void> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const loadStatistics = useCallback(() => {
    if (statistics || requestRef.current) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsLoading(true);
    setError(null);
    requestRef.current = loadDraftPlayerStatistics(
      dotaId,
      abortController.signal,
    )
      .then(setStatistics)
      .catch((requestError: unknown) => {
        if (abortController.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не удалось загрузить статистику игрока",
        );
      })
      .finally(() => {
        requestRef.current = null;
        if (!abortController.signal.aborted) setIsLoading(false);
      });
  }, [dotaId, statistics]);

  return { statistics, isLoading, error, loadStatistics };
}
