"use client";

import { useEffect, useRef, useState } from "react";
import { isRankedWinCount, type RankedWinUpdateSource } from "@/lib/season-ranked-wins/organizer-model";
import type { SeasonRoundRegistration } from "../model/season-types";
import { saveRankedWinUpdate } from "../services/ranked-win-update";
import { collectDotabuffBrowserWins, DotabuffExtensionMissingError } from "../services/dotabuff-browser";

export function useRankedWinEditor(registration: SeasonRoundRegistration, onSaved: () => Promise<void>) {
  const [isManual, setIsManual] = useState(false);
  const [pendingSource, setPendingSource] = useState<RankedWinUpdateSource | null>(null);
  const [primaryWins, setPrimaryWins] = useState("");
  const [secondaryWins, setSecondaryWins] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [needsExtension, setNeedsExtension] = useState(false);
  const [isAwaitingBrowser, setIsAwaitingBrowser] = useState(false);
  const browserAbort = useRef<AbortController | null>(null);
  const isSavingRef = useRef(false);
  useEffect(() => () => browserAbort.current?.abort(), []);

  function reset() {
    setIsManual(false);
    setError("");
    setProgress("");
    setNeedsExtension(false);
    setPrimaryWins(registration.primary_wins === null ? "" : String(registration.primary_wins));
    setSecondaryWins(registration.secondary_wins === null ? "" : String(registration.secondary_wins));
  }

  async function save(source: RankedWinUpdateSource): Promise<boolean> {
    if (isSavingRef.current) return false;
    setError("");
    setNeedsExtension(false);
    if (source === "manual" && (!primaryWins.trim() || !secondaryWins.trim()
      || !isRankedWinCount(Number(primaryWins)) || !isRankedWinCount(Number(secondaryWins)))) {
      setError("Заполните оба поля целыми неотрицательными числами");
      return false;
    }
    isSavingRef.current = true;
    setPendingSource(source);
    try {
      let browserImport;
      if (source === "dotabuff") {
        const controller = new AbortController();
        browserAbort.current = controller;
        setIsAwaitingBrowser(true);
        browserImport = await collectDotabuffBrowserWins(registration.dota_id, controller.signal, setProgress);
        if (controller.signal.aborted) throw new Error("Проверка отменена");
        browserAbort.current = null;
        setIsAwaitingBrowser(false);
        setProgress("Статистика собрана. Сохраняем победы…");
      }
      await saveRankedWinUpdate({
        roundId: registration.round_id, playerId: registration.player_id,
        positions: registration.positions, source,
        ...(browserImport ? { browserImport } : {}),
        ...(source === "manual" ? { primaryWins: Number(primaryWins), secondaryWins: Number(secondaryWins) } : {}),
      });
      await onSaved();
      return true;
    } catch (error) {
      if (error instanceof DotabuffExtensionMissingError) setNeedsExtension(true);
      setError(error instanceof Error ? error.message : "Не удалось обновить победы");
      return false;
    } finally {
      isSavingRef.current = false;
      setPendingSource(null);
      setIsAwaitingBrowser(false);
      browserAbort.current = null;
      setProgress("");
    }
  }

  return { isManual, setIsManual, pendingSource, primaryWins, setPrimaryWins,
    secondaryWins, setSecondaryWins, error, reset, save, progress, needsExtension,
    isAwaitingBrowser, cancelBrowser: () => browserAbort.current?.abort() };
}
