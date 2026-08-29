"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  FearlessDraftCommand,
  FearlessDraftSnapshot,
} from "../model/snapshot";
import {
  draftRequestErrorMessage,
  fetchDraftRequest,
  readDraftResponse,
} from "../services/draft-request";

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
    const response = await fetchDraftRequest(`/api/fearless-draft${suffix}`, {
      cache: "no-store",
    });
    const body = await readDraftResponse<FearlessDraftSnapshot & CommandResponse>(
      response,
      "Не удалось обновить драфт",
    );
    setSnapshot(body);
  }, [seasonMatchId]);

  useEffect(() => {
    const suffix = seasonMatchId ? `?seasonMatchId=${seasonMatchId}` : "";
    const events = new EventSource(`/api/fearless-draft/events${suffix}`);
    const receiveSnapshot = (event: MessageEvent<string>) => {
      try {
        setSnapshot(JSON.parse(event.data) as FearlessDraftSnapshot);
      } catch {
        setError("Не удалось обновить драфт");
        void reload().catch(() => undefined);
        return;
      }
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
      const response = await fetchDraftRequest(`/api/fearless-draft${suffix}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(command),
      });
      await readDraftResponse<CommandResponse>(
        response,
        "Действие не выполнено",
        { allowEmptySuccess: true },
      );
      setError("");
      if (!isConnected) await reload();
      return true;
    } catch (reason) {
      setError(draftRequestErrorMessage(reason, "Действие не выполнено"));
      await reload().catch(() => undefined);
      return false;
    } finally {
      setIsSending(false);
    }
  }, [isConnected, reload, seasonMatchId]);

  return { snapshot, error, isSending, isConnected, send };
}
