"use client";

import { useRef, useState } from "react";
import { isRankedWinCount, type RankedWinUpdateSource } from "@/lib/season-ranked-wins/organizer-model";
import type { SeasonRoundRegistration } from "../model/season-types";
import { saveRankedWinUpdate } from "../services/ranked-win-update";

export function useRankedWinEditor(registration: SeasonRoundRegistration, onSaved: () => Promise<void>) {
  const [isManual, setIsManual] = useState(false);
  const [pendingSource, setPendingSource] = useState<RankedWinUpdateSource | null>(null);
  const [primaryWins, setPrimaryWins] = useState("");
  const [secondaryWins, setSecondaryWins] = useState("");
  const [error, setError] = useState("");
  const isSavingRef = useRef(false);

  function reset() {
    setIsManual(false);
    setError("");
    setPrimaryWins(registration.primary_wins === null ? "" : String(registration.primary_wins));
    setSecondaryWins(registration.secondary_wins === null ? "" : String(registration.secondary_wins));
  }

  async function save(source: RankedWinUpdateSource): Promise<boolean> {
    if (isSavingRef.current) return false;
    setError("");
    if (source === "manual" && (!primaryWins.trim() || !secondaryWins.trim()
      || !isRankedWinCount(Number(primaryWins)) || !isRankedWinCount(Number(secondaryWins)))) {
      setError("Заполните оба поля целыми неотрицательными числами");
      return false;
    }
    isSavingRef.current = true;
    setPendingSource(source);
    try {
      await saveRankedWinUpdate({
        roundId: registration.round_id, playerId: registration.player_id,
        positions: registration.positions, source,
        ...(source === "manual" ? { primaryWins: Number(primaryWins), secondaryWins: Number(secondaryWins) } : {}),
      });
      await onSaved();
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось обновить победы");
      return false;
    } finally {
      isSavingRef.current = false;
      setPendingSource(null);
    }
  }

  return { isManual, setIsManual, pendingSource, primaryWins, setPrimaryWins,
    secondaryWins, setSecondaryWins, error, reset, save };
}
