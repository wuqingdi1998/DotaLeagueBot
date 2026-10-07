import { afterEach, describe, expect, it, vi } from "vitest";
import { OCTOBER_PREVIEW_SECTIONS } from "../model/sections";
import { reloadOctoberCompendiumAfterReward, restoreOctoberCompendiumSection } from "./reward-refresh";

afterEach(() => vi.unstubAllGlobals());

describe("reward refresh navigation", () => {
  it.each(OCTOBER_PREVIEW_SECTIONS.map((section, index) => [section.id, index] as const))(
    "reloads and restores %s rather than a stale hash",
    (id, index) => {
      const location = { hash: "#october-section-clans", reload: vi.fn() };
      const state = { existing: "router state" };
      const replaceState = vi.fn((_state, _title, hash: string) => { location.hash = hash; });
      const elements = new Map(OCTOBER_PREVIEW_SECTIONS.map((section, sectionIndex) => [section.id, {
        getBoundingClientRect: () => ({ top: (sectionIndex - index) * 800, bottom: (sectionIndex - index + 1) * 800 }),
        scrollIntoView: vi.fn(),
      }]));
      vi.stubGlobal("window", { innerHeight: 800, location, history: { state, replaceState } });
      vi.stubGlobal("document", { getElementById: (key: string) => [...elements].find(([id]) => id === key)?.[1] });

      reloadOctoberCompendiumAfterReward();
      expect(replaceState).toHaveBeenCalledWith(state, "", `#${id}`);
      expect(location.reload).toHaveBeenCalledOnce();
      restoreOctoberCompendiumSection();
      expect(elements.get(id)?.scrollIntoView).toHaveBeenCalledWith({ behavior: "instant", block: "start" });
    },
  );

  it("selects the most visible screen on a partially scrolled mobile page", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", { innerHeight: 700, location: { reload: vi.fn() }, history: { replaceState } });
    vi.stubGlobal("document", { getElementById: (id: string) => ({
      getBoundingClientRect: () => id === "october-section-daily"
        ? { top: 150, bottom: 2000 } : { top: -1000, bottom: 150 },
    }) });
    reloadOctoberCompendiumAfterReward();
    expect(replaceState).toHaveBeenCalledWith(undefined, "", "#october-section-daily");
  });

  it("ignores unrelated hashes and missing sections", () => {
    const getElementById = vi.fn(() => null);
    const reload = vi.fn();
    const replaceState = vi.fn();
    vi.stubGlobal("window", { innerHeight: 800, location: { hash: "#unrelated", reload }, history: { replaceState } });
    vi.stubGlobal("document", { getElementById });
    restoreOctoberCompendiumSection();
    expect(getElementById).not.toHaveBeenCalled();
    reloadOctoberCompendiumAfterReward();
    expect(reload).toHaveBeenCalledOnce();
    expect(replaceState).not.toHaveBeenCalled();
  });
});
