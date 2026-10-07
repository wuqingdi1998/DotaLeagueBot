import { OCTOBER_PREVIEW_SECTIONS } from "../model/sections";

/** Use the visible screen, not the hash: touch scrolling can leave the hash stale. */
export function reloadOctoberCompendiumAfterReward() {
  const visibleSections = OCTOBER_PREVIEW_SECTIONS.flatMap(({ id }) => {
    const element = document.getElementById(id);
    if (!element) return [];
    const rect = element.getBoundingClientRect();
    const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    return [{ id, visibleHeight }];
  });
  const current = visibleSections.sort((left, right) => right.visibleHeight - left.visibleHeight)[0];
  if (current && current.visibleHeight > 0) {
    window.history.replaceState(window.history.state, "", `#${current.id}`);
  }
  window.location.reload();
}

export function restoreOctoberCompendiumSection() {
  const id = window.location.hash.slice(1);
  if (!OCTOBER_PREVIEW_SECTIONS.some((section) => section.id === id)) return;
  document.getElementById(id)?.scrollIntoView({ behavior: "instant", block: "start" });
}
