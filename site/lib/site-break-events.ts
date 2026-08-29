import "server-only";

export type SiteBreakEvent = {
  isBreakEnabled: boolean;
};

type SiteBreakListener = (event: SiteBreakEvent) => void;

declare global {
  var __linkensSphereSiteBreakListeners: Set<SiteBreakListener> | undefined;
}

function listeners(): Set<SiteBreakListener> {
  globalThis.__linkensSphereSiteBreakListeners ??= new Set();
  return globalThis.__linkensSphereSiteBreakListeners;
}

export function publishSiteBreakEvent(event: SiteBreakEvent): void {
  for (const listener of listeners()) listener(event);
}

export function subscribeToSiteBreakEvents(
  listener: SiteBreakListener,
): () => void {
  listeners().add(listener);
  return () => listeners().delete(listener);
}
