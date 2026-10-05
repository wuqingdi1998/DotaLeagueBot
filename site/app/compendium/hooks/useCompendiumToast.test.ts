import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const lifecycle = vi.hoisted(() => ({
  state: { message: "", sequence: 0 },
  effect: undefined as (() => void | (() => void)) | undefined,
}));

vi.mock("react", () => ({
  useState: () => [
    lifecycle.state,
    (update: (current: typeof lifecycle.state) => typeof lifecycle.state) => {
      lifecycle.state = update(lifecycle.state);
    },
  ],
  useEffect: (effect: () => void | (() => void)) => {
    lifecycle.effect = effect;
  },
}));

import { COMPENDIUM_TOAST_DURATION_MS, useCompendiumToast } from "./useCompendiumToast";

describe("compendium toast lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", globalThis);
    lifecycle.state = { message: "", sequence: 0 };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function useCommitEffect() {
    useCompendiumToast();
    return lifecycle.effect?.();
  }

  it.each(["Испытание выполнено. Получено звёзд: 1.", "Ошибка проверки"])("hides %s after seven seconds", (message) => {
    const [, showToast] = useCompendiumToast();
    showToast(message);
    const cleanup = useCommitEffect();
    vi.advanceTimersByTime(COMPENDIUM_TOAST_DURATION_MS - 1);
    expect(lifecycle.state.message).toBe(message);
    vi.advanceTimersByTime(1);
    expect(lifecycle.state.message).toBe("");
    cleanup?.();
  });

  it("gives repeated identical notifications a fresh lifetime", () => {
    const [, showToast] = useCompendiumToast();
    showToast("Готово");
    const cleanup = useCommitEffect();
    const firstNotification = lifecycle.state;
    vi.advanceTimersByTime(6_000);
    showToast("Готово");
    expect(lifecycle.state).not.toBe(firstNotification);
    cleanup?.();
    useCommitEffect();
    vi.advanceTimersByTime(1_000);
    expect(lifecycle.state.message).toBe("Готово");
    vi.advanceTimersByTime(6_000);
    expect(lifecycle.state.message).toBe("");
  });

  it("cleans up timers on unmount and does not schedule empty notifications", () => {
    useCommitEffect();
    expect(vi.getTimerCount()).toBe(0);
    const [, showToast] = useCompendiumToast();
    showToast("Готово");
    const cleanup = useCommitEffect();
    expect(vi.getTimerCount()).toBe(1);
    cleanup?.();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("uses automatic dismissal for both October toast surfaces and the dashboard", () => {
    const october = readFileSync(new URL("../../organizer/compendium-october/sections/OctoberActivityPreview.tsx", import.meta.url), "utf8");
    const dashboard = readFileSync(new URL("../sections/CompendiumDashboard.tsx", import.meta.url), "utf8");
    expect(october.match(/const \[message, setMessage\] = useCompendiumToast\(\)/g)).toHaveLength(2);
    expect(dashboard).toContain("const [toast, setToast] = useCompendiumToast()");
  });
});
