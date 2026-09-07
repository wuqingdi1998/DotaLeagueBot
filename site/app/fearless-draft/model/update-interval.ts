import {
  DRAFT_FINAL_RESERVE_SYNC_INTERVAL_MS,
  DRAFT_FINAL_RESERVE_SYNC_SECONDS,
  DRAFT_SYNC_INTERVAL_MS,
} from "./config";
import { draftTimerSnapshot } from "./timer";

type DraftUpdateIntervalState = {
  stepStartedAt: string | null;
  baseDurationSeconds: number | null;
  reserveSeconds: number | null;
  serverNow: string;
};

export function draftUpdateIntervalMs(state: DraftUpdateIntervalState): number {
  if (
    !state.stepStartedAt ||
    state.baseDurationSeconds === null ||
    state.reserveSeconds === null
  ) {
    return DRAFT_SYNC_INTERVAL_MS;
  }

  const timer = draftTimerSnapshot(
    {
      stepStartedAt: state.stepStartedAt,
      baseDurationSeconds: state.baseDurationSeconds,
      reserveSeconds: state.reserveSeconds,
    },
    new Date(state.serverNow),
  );
  return timer.isUsingReserve &&
      timer.reserveRemainingSeconds <= DRAFT_FINAL_RESERVE_SYNC_SECONDS
    ? DRAFT_FINAL_RESERVE_SYNC_INTERVAL_MS
    : DRAFT_SYNC_INTERVAL_MS;
}
