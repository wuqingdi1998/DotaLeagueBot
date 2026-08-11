export function serverClockOffsetMs(
  serverNow: string,
  clientNowMs: number,
): number {
  return Date.parse(serverNow) - clientNowMs;
}

export function applyServerClockOffset(
  clientNowMs: number,
  serverOffsetMs: number,
): number {
  return clientNowMs + serverOffsetMs;
}
