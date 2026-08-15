import type { DraftLocale } from "./i18n";

export const DRAFT_LOCALE_EASTER_EGG_CLICKS = 20;
export const DRAFT_LOCALE_EASTER_EGG_WINDOW_MS = 30_000;

type DraftLanguageToggleState = {
  locale: DraftLocale;
  recentToggleTimes: number[];
};

export function registerDraftLanguageToggle(
  locale: DraftLocale,
  recentToggleTimes: readonly number[],
  now: number,
): DraftLanguageToggleState {
  if (locale === "uk") {
    return { locale: "ru", recentToggleTimes: [] };
  }

  const windowStart = now - DRAFT_LOCALE_EASTER_EGG_WINDOW_MS;
  const nextToggleTimes = recentToggleTimes
    .filter((toggleTime) => toggleTime >= windowStart)
    .concat(now);

  if (nextToggleTimes.length >= DRAFT_LOCALE_EASTER_EGG_CLICKS) {
    return { locale: "uk", recentToggleTimes: [] };
  }

  return {
    locale: locale === "ru" ? "en" : "ru",
    recentToggleTimes: nextToggleTimes,
  };
}
