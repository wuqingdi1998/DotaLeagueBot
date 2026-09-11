import { DRAFT_SEQUENCE } from "./config";

export type DraftTurnTimer = {
  player1Id: string;
  player2Id: string;
  firstPickPlayerId: string;
  currentStep: number;
  stepStartedAt: Date;
  player1ReserveSeconds: number;
  player2ReserveSeconds: number;
};

export function draftTurnDeadline(timer: DraftTurnTimer): Date | null {
  const step = DRAFT_SEQUENCE[timer.currentStep];
  if (!step) return null;
  const actorId = step.actor === "FIRST"
    ? timer.firstPickPlayerId
    : timer.firstPickPlayerId === timer.player1Id
      ? timer.player2Id
      : timer.player1Id;
  const reserve = actorId === timer.player1Id
    ? timer.player1ReserveSeconds
    : timer.player2ReserveSeconds;
  return new Date(
    timer.stepStartedAt.getTime()
      + (step.baseDurationSeconds + reserve) * 1_000,
  );
}
