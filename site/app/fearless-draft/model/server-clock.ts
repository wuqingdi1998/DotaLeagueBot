export function serverNowAfterElapsed(
  serverNow: string,
  elapsedMs: number,
): number {
  return Date.parse(serverNow) + Math.max(0, elapsedMs);
}
