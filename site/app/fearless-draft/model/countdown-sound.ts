import type { DraftTimerSnapshot } from "./timer";

export const DRAFT_COUNTDOWN_SOUND_SECONDS = 10;

export function draftCountdownCueSecond(
  timer: DraftTimerSnapshot | null,
): number | null {
  if (!timer || timer.isExpired) return null;

  const remainingSeconds = timer.isUsingReserve
    ? timer.reserveRemainingSeconds
    : timer.reserveRemainingSeconds === 0
      ? timer.baseRemainingSeconds
      : null;
  if (remainingSeconds === null || remainingSeconds <= 0) return null;

  const cueSecond = Math.ceil(remainingSeconds);
  return cueSecond <= DRAFT_COUNTDOWN_SOUND_SECONDS ? cueSecond : null;
}
