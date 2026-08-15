import { describe, expect, it } from "vitest";
import type { DraftLocale } from "./i18n";
import {
  DRAFT_LOCALE_EASTER_EGG_CLICKS,
  DRAFT_LOCALE_EASTER_EGG_WINDOW_MS,
  registerDraftLanguageToggle,
} from "./locale-easter-egg";

type ToggleState = {
  locale: DraftLocale;
  recentToggleTimes: number[];
};

function toggleRepeatedly(
  initialState: ToggleState,
  count: number,
  startAt: number,
  intervalMs: number,
): ToggleState {
  let state = initialState;
  for (let index = 0; index < count; index += 1) {
    state = registerDraftLanguageToggle(
      state.locale,
      state.recentToggleTimes,
      startAt + (index * intervalMs),
    );
  }
  return state;
}

describe("Fearless Draft Ukrainian easter egg", () => {
  it("activates Ukrainian on the twentieth toggle within thirty seconds", () => {
    const beforeActivation = toggleRepeatedly(
      { locale: "ru", recentToggleTimes: [] },
      DRAFT_LOCALE_EASTER_EGG_CLICKS - 1,
      1_000,
      1_000,
    );
    expect(beforeActivation.locale).not.toBe("uk");

    const activated = registerDraftLanguageToggle(
      beforeActivation.locale,
      beforeActivation.recentToggleTimes,
      20_000,
    );
    expect(activated).toEqual({ locale: "uk", recentToggleTimes: [] });
  });

  it("does not activate when twenty toggles exceed the time window", () => {
    const result = toggleRepeatedly(
      { locale: "ru", recentToggleTimes: [] },
      DRAFT_LOCALE_EASTER_EGG_CLICKS,
      0,
      (DRAFT_LOCALE_EASTER_EGG_WINDOW_MS / 10) + 1,
    );
    expect(result.locale).not.toBe("uk");
  });

  it("returns from Ukrainian to Russian and can be activated again", () => {
    const ukrainian = toggleRepeatedly(
      { locale: "ru", recentToggleTimes: [] },
      DRAFT_LOCALE_EASTER_EGG_CLICKS,
      1_000,
      1_000,
    );
    const russian = registerDraftLanguageToggle(
      ukrainian.locale,
      ukrainian.recentToggleTimes,
      22_000,
    );
    expect(russian).toEqual({ locale: "ru", recentToggleTimes: [] });

    const activatedAgain = toggleRepeatedly(
      russian,
      DRAFT_LOCALE_EASTER_EGG_CLICKS,
      30_000,
      1_000,
    );
    expect(activatedAgain.locale).toBe("uk");
  });
});
