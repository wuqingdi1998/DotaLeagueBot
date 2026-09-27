"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type OctoberGuideKey = "daily-overview" | "clan-outing";

const EMPTY_PREFERENCES = "[]";
const preferencesChangedEvent = "october-guide-preferences-changed";

function storageKey(viewerDiscordId: string) {
  return `october-compendium:guide-preferences:${viewerDiscordId}`;
}

function readPreferences(key: string) {
  try {
    return window.localStorage.getItem(key) ?? EMPTY_PREFERENCES;
  } catch {
    return EMPTY_PREFERENCES;
  }
}

function parsePreferences(value: string): Set<OctoberGuideKey> {
  try {
    const storedKeys = JSON.parse(value);
    if (!Array.isArray(storedKeys)) return new Set();
    return new Set(storedKeys.filter(
      (key): key is OctoberGuideKey => key === "daily-overview" || key === "clan-outing",
    ));
  } catch {
    return new Set();
  }
}

export function useOctoberGuideVisibility(viewerDiscordId: string) {
  const key = storageKey(viewerDiscordId);
  const subscribe = useCallback((onChange: () => void) => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === key) onChange();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(preferencesChangedEvent, onChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(preferencesChangedEvent, onChange);
    };
  }, [key]);
  const getSnapshot = useCallback(() => readPreferences(key), [key]);
  const storedValue = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_PREFERENCES);
  const hiddenGuides = useMemo(() => parsePreferences(storedValue), [storedValue]);

  const save = useCallback((next: Set<OctoberGuideKey>) => {
    try {
      window.localStorage.setItem(key, JSON.stringify([...next]));
      window.dispatchEvent(new Event(preferencesChangedEvent));
    } catch {
      // The hints remain visible when browser storage is unavailable.
    }
  }, [key]);

  return {
    isVisible: (guideKey: OctoberGuideKey) => !hiddenGuides.has(guideKey),
    dismiss: (guideKey: OctoberGuideKey) => save(new Set([...hiddenGuides, guideKey])),
    restoreAll: () => save(new Set()),
  };
}
