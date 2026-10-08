export function dailyResetCountdownLabel(resetAt: string, currentTimeMs: number): string {
  const remaining = Math.max(0, Date.parse(resetAt) - currentTimeMs);
  const totalSeconds = Math.ceil(remaining / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}
