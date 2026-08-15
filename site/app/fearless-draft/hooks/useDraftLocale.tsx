"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DRAFT_TRANSLATIONS,
  type DraftLocale,
  type DraftTranslations,
} from "../model/i18n";

type DraftLocaleContextValue = {
  locale: DraftLocale;
  setLocale: (locale: DraftLocale) => void;
  text: DraftTranslations;
};

const DraftLocaleContext = createContext<DraftLocaleContextValue | null>(null);

export function DraftLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<DraftLocale>("ru");
  const value = useMemo(
    () => ({ locale, setLocale, text: DRAFT_TRANSLATIONS[locale] }),
    [locale],
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
