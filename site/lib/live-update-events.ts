import "server-only";

type LiveUpdateListener = () => void;

declare global {
  var __linkensSphereLiveUpdateListeners:
    | Map<string, Set<LiveUpdateListener>>
    | undefined;
}

function channels(): Map<string, Set<LiveUpdateListener>> {
  globalThis.__linkensSphereLiveUpdateListeners ??= new Map();
  return globalThis.__linkensSphereLiveUpdateListeners;
}

export function publishLiveUpdate(channel: string): void {
  for (const listener of channels().get(channel) ?? []) {
    try {
      listener();
    } catch (error) {
      console.error("Live update listener failed after a saved action", { channel, error });
    }
  }
}

export function subscribeToLiveUpdates(
  channel: string,
  listener: LiveUpdateListener,
): () => void {
  const listeners = channels().get(channel) ?? new Set<LiveUpdateListener>();
  listeners.add(listener);
  channels().set(channel, listeners);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) channels().delete(channel);
  };
}

export function fearlessDraftChannel(
  seasonMatchId: number | null | undefined,
): string {
  return seasonMatchId
    ? `fearless-draft:season:${seasonMatchId}`
    : "fearless-draft:standalone";
}

export function seasonLobbyChannel(matchId: number): string {
  return `season-lobby:${matchId}`;
}
