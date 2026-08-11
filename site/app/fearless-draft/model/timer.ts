export type DraftTimerState = {
  baseDurationSeconds: number;
  reserveSeconds: number;
  stepStartedAt: string | Date;
};

export type DraftTimerSnapshot = {
  baseRemainingSeconds: number;
  reserveRemainingSeconds: number;
  isUsingReserve: boolean;
  isExpired: boolean;
};

export function draftTimerSnapshot(
  timer: DraftTimerState,
  now: Date,
): DraftTimerSnapshot {
  const startedAt = new Date(timer.stepStartedAt).getTime();
  const elapsedSeconds = Math.max(0, (now.getTime() - startedAt) / 1000);
  const baseRemainingSeconds = Math.max(
    0,
    timer.baseDurationSeconds - elapsedSeconds,
  );
  const reserveUsedSeconds = Math.max(
    0,
    elapsedSeconds - timer.baseDurationSeconds,
  );
  const reserveRemainingSeconds = Math.max(
    0,
    timer.reserveSeconds - reserveUsedSeconds,
  );
  return {
    baseRemainingSeconds,
    reserveRemainingSeconds,
    isUsingReserve: baseRemainingSeconds === 0 && reserveRemainingSeconds > 0,
    isExpired:
      elapsedSeconds >= timer.baseDurationSeconds + timer.reserveSeconds,
  };
}

export function consumedReserveSeconds(
  timer: DraftTimerState,
  now: Date,
): number {
  const snapshot = draftTimerSnapshot(timer, now);
  return Math.max(0, timer.reserveSeconds - snapshot.reserveRemainingSeconds);
}
