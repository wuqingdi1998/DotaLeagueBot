"use client";

import { useRef, useState } from "react";
import type { RankedWinSnapshot } from "@/lib/season-ranked-wins/model";
import {
  isRankedWinCount,
  type RankedWinUpdateSource,
} from "@/lib/season-ranked-wins/organizer-model";
import type { SeasonRoundRegistration } from "../model/season-types";
import { saveRankedWinUpdate } from "../services/ranked-win-update";
import { checkStratzWithRetries } from "../services/ranked-win-retry";
import { sendRankedWinWarning } from "../services/ranked-win-warning";

export function useRankedWinEditor(
  registration: SeasonRoundRegistration,
  onSaved: () => Promise<void>,
) {
  const [isManual, setIsManual] = useState(false);
  const [pendingSource, setPendingSource] =
    useState<RankedWinUpdateSource | null>(null);
  const [primaryWins, setPrimaryWins] = useState("");
  const [secondaryWins, setSecondaryWins] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSendingWarning, setIsSendingWarning] = useState(false);
  const isSavingRef = useRef(false);

  function reset() {
    setIsManual(false);
    setError("");
    setStatus("");
    setPrimaryWins(
      registration.primary_wins === null
        ? ""
        : String(registration.primary_wins),
    );
    setSecondaryWins(
      registration.secondary_wins === null
        ? ""
        : String(registration.secondary_wins),
    );
  }

  async function save(
    source: RankedWinUpdateSource,
  ): Promise<RankedWinSnapshot | null> {
    if (isSavingRef.current) return null;
    setError("");
    if (
      source === "manual"
      && (
        !primaryWins.trim()
        || !secondaryWins.trim()
        || !isRankedWinCount(Number(primaryWins))
        || !isRankedWinCount(Number(secondaryWins))
      )
    ) {
      setError("Заполните оба поля целыми неотрицательными числами");
      return null;
    }
    isSavingRef.current = true;
    setPendingSource(source);
    try {
      const request = () => saveRankedWinUpdate({
        roundId: registration.round_id,
        playerId: registration.player_id,
        positions: registration.positions,
        source,
        ...(source === "manual" ? {
          primaryWins: Number(primaryWins),
          secondaryWins: Number(secondaryWins),
        } : {}),
      });
      const rankedWins = source === "stratz"
        ? await checkStratzWithRetries({
          check: request,
          onProgress: ({ message }) => setStatus(message),
        })
        : await request();
      await onSaved();
      return rankedWins;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Не удалось обновить победы",
      );
      return null;
    } finally {
      isSavingRef.current = false;
      setPendingSource(null);
      setStatus("");
    }
  }

  async function sendWarning(): Promise<boolean> {
    if (isSavingRef.current) return false;
    isSavingRef.current = true;
    setError("");
    setIsSendingWarning(true);
    try {
      await sendRankedWinWarning({
        roundId: registration.round_id,
        playerId: registration.player_id,
      });
      return true;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Не удалось отправить предупреждение",
      );
      return false;
    } finally {
      isSavingRef.current = false;
      setIsSendingWarning(false);
    }
  }

  return {
    error,
    isManual,
    isSendingWarning,
    pendingSource,
    primaryWins,
    reset,
    save,
    secondaryWins,
    sendWarning,
    setIsManual,
    setPrimaryWins,
    setSecondaryWins,
    status,
  };
}
