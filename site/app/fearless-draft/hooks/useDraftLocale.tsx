"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  DRAFT_TRANSLATIONS,
  type DraftLocale,
  type DraftTranslations,
} from "../model/i18n";
import { registerDraftLanguageToggle } from "../model/locale-easter-egg";

type DraftLocaleContextValue = {
  locale: DraftLocale;
  toggleLocale: () => void;
  text: DraftTranslations;
};

const DraftLocaleContext = createContext<DraftLocaleContextValue | null>(null);

export function DraftLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<DraftLocale>("ru");
  const recentToggleTimesRef = useRef<number[]>([]);
  const toggleLocale = useCallback(() => {
    const nextState = registerDraftLanguageToggle(
      locale,
      recentToggleTimesRef.current,
      performance.now(),
    );
    recentToggleTimesRef.current = nextState.recentToggleTimes;
    setLocale(nextState.locale);
  }, [locale]);
  const value = useMemo(
    () => ({ locale, toggleLocale, text: DRAFT_TRANSLATIONS[locale] }),
    [locale, toggleLocale],
  );

  return (
    <DraftLocaleContext.Provider value={value}>
      {children}
    </DraftLocaleContext.Provider>
  );
}

export function useDraftLocale(): DraftLocaleContextValue {
  const context = useContext(DraftLocaleContext);
  if (!context) throw new Error("useDraftLocale must be used inside DraftLocaleProvider");
  return context;
}
