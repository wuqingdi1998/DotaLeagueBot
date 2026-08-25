export function serverTimeFromAnchor(
  serverNow: string,
  monotonicAnchorMs: number,
  monotonicNowMs: number,
): number {
  return Date.parse(serverNow) + Math.max(0, monotonicNowMs - monotonicAnchorMs);
}
