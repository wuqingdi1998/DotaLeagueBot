"use client";

import { useEffect, useState } from "react";

export const COMPENDIUM_TOAST_DURATION_MS = 7_000;

export function useCompendiumToast() {
  const [notification, setNotification] = useState({ message: "", sequence: 0 });

  useEffect(() => {
    if (!notification.message) return;
    const timer = window.setTimeout(() => {
      setNotification((current) => ({ ...current, message: "" }));
    }, COMPENDIUM_TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [notification]);

  function showToast(message: string) {
    setNotification((current) => ({ message, sequence: current.sequence + 1 }));
  }

  return [notification.message, showToast] as const;
}
