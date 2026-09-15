import type { DraftTimerSnapshot } from "./timer";

export const DRAFT_COUNTDOWN_WARNING_SECONDS = 10;

export function isDraftCountdownWarning(
  timer: DraftTimerSnapshot | null,
): boolean {
  if (!timer || timer.isExpired) return false;

  const remainingSeconds = timer.baseRemainingSeconds
    + timer.reserveRemainingSeconds;
  return remainingSeconds > 0
    && remainingSeconds <= DRAFT_COUNTDOWN_WARNING_SECONDS;
}

export function draftCountdownCueId(
  mapId: number,
  currentStep: number,
  isCountdownWarning: boolean,
): string | null {
  return isCountdownWarning ? `${mapId}:${currentStep}` : null;
}
