"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isDraftCommandConfirmed } from "../model/command-confirmation";
import { unavailableDataMessage } from "@/lib/site-request";
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
  const sendingRef = useRef(false);

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
    return body;
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
    events.addEventListener("server-error", () => {
      setIsConnected(false);
      setError(unavailableDataMessage);
    });
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
    if (sendingRef.current) return false;
    sendingRef.current = true;
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
      if (!isConnected) {
        await reload().catch(() => setError("Действие сохранено. Не удалось обновить экран"));
      }
      return true;
    } catch (reason) {
      const current = await reload().catch(() => null);
      if (current && isDraftCommandConfirmed(command, snapshot, current)) {
        setError("");
        return true;
      }
      setError(draftRequestErrorMessage(reason, "Действие не выполнено"));
      return false;
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  }, [isConnected, reload, seasonMatchId, snapshot]);

  return { snapshot, error, isSending, isConnected, send };
}
