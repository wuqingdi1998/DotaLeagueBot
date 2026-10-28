"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CupBoard, CupSnapshot } from "../model/cup-board";
import { CupSaveError, fetchCupConstructor, persistCupBoard } from "../services/cup-client";

export function useCupConstructor() {
  const [snapshot, setSnapshot] = useState<CupSnapshot | null>(null);
  const [saveStatus, setSaveStatus] = useState<"loading" | "saved" | "saving" | "error">("loading");
  const [error, setError] = useState("");
  const [hasConflict, setHasConflict] = useState(false);
  const current = useRef<CupSnapshot | null>(null);
  const pending = useRef<CupBoard | null>(null);
  const isSaving = useRef(false);

  const reload = useCallback(async () => {
    setSaveStatus("loading");
    try {
      const loaded = await fetchCupConstructor();
      current.current = loaded;
      pending.current = null;
      setSnapshot(loaded);
      setError("");
      setHasConflict(false);
      setSaveStatus("saved");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить конструктор");
      setSaveStatus("error");
    }
  }, []);

  const savePending = useCallback(async () => {
    if (isSaving.current || !current.current || !pending.current) return;
    isSaving.current = true;
    setSaveStatus("saving");
    setError("");
    try {
      while (pending.current && current.current) {
        const board = pending.current;
        pending.current = null;
        try {
          const revision = await persistCupBoard(board, current.current.revision);
          current.current = { ...current.current, revision };
        } catch (reason) {
          pending.current ??= board;
          throw reason;
        }
      }
      setSaveStatus("saved");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить расстановку");
      setHasConflict(reason instanceof CupSaveError && reason.status === 409);
      setSaveStatus("error");
    } finally {
      isSaving.current = false;
    }
  }, []);

  const changeBoard = useCallback((change: (board: CupBoard) => CupBoard) => {
    if (!current.current) return;
    const board = change(current.current.board);
    if (board === current.current.board) return;
    current.current = { ...current.current, board };
    pending.current = board;
    setSnapshot(current.current);
    void savePending();
  }, [savePending]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    const warnIfUnsaved = (event: BeforeUnloadEvent) => {
      if (!pending.current && !isSaving.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnIfUnsaved);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeunload", warnIfUnsaved);
    };
  }, [reload]);

  return { snapshot, saveStatus, error, hasConflict, changeBoard, reload, retry: savePending };
}
