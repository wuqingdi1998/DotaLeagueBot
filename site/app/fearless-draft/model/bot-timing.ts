export const BOT_DECISION_WINDOW_SECONDS = 60;
export const BOT_MIN_DELAY_MS = 2_000;
export const BOT_DEADLINE_MARGIN_MS = 2_000;

export function randomBotDueAt(start: number, deadline: number, random: () => number): number {
  const available = Math.max(0, deadline - start - BOT_DEADLINE_MARGIN_MS);
  const minimum = Math.min(BOT_MIN_DELAY_MS, available);
  return start + minimum + Math.floor(Math.max(0, Math.min(1, random())) * (available - minimum));
}
