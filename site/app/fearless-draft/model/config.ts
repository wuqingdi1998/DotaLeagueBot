import type { DraftSequenceStep } from "./types";

export const DRAFT_RESERVE_SECONDS = 130;

export const DRAFT_SEQUENCE: readonly DraftSequenceStep[] = [
  { actor: "FIRST", type: "BAN", phase: "FIRST_BANS", baseDurationSeconds: 15 },
  { actor: "FIRST", type: "BAN", phase: "FIRST_BANS", baseDurationSeconds: 15 },
  { actor: "SECOND", type: "BAN", phase: "FIRST_BANS", baseDurationSeconds: 15 },
  { actor: "SECOND", type: "BAN", phase: "FIRST_BANS", baseDurationSeconds: 15 },
  { actor: "FIRST", type: "BAN", phase: "FIRST_BANS", baseDurationSeconds: 15 },
  { actor: "SECOND", type: "BAN", phase: "FIRST_BANS", baseDurationSeconds: 15 },
  { actor: "SECOND", type: "BAN", phase: "FIRST_BANS", baseDurationSeconds: 15 },
  { actor: "FIRST", type: "PICK", phase: "FIRST_PICKS", baseDurationSeconds: 30 },
  { actor: "SECOND", type: "PICK", phase: "FIRST_PICKS", baseDurationSeconds: 30 },
  { actor: "FIRST", type: "BAN", phase: "SECOND_BANS", baseDurationSeconds: 30 },
  { actor: "FIRST", type: "BAN", phase: "SECOND_BANS", baseDurationSeconds: 30 },
  { actor: "SECOND", type: "BAN", phase: "SECOND_BANS", baseDurationSeconds: 30 },
  { actor: "SECOND", type: "PICK", phase: "SECOND_PICKS", baseDurationSeconds: 30 },
  { actor: "FIRST", type: "PICK", phase: "SECOND_PICKS", baseDurationSeconds: 30 },
  { actor: "FIRST", type: "PICK", phase: "SECOND_PICKS", baseDurationSeconds: 30 },
  { actor: "SECOND", type: "PICK", phase: "SECOND_PICKS", baseDurationSeconds: 30 },
  { actor: "SECOND", type: "PICK", phase: "SECOND_PICKS", baseDurationSeconds: 30 },
  { actor: "FIRST", type: "PICK", phase: "SECOND_PICKS", baseDurationSeconds: 30 },
  { actor: "FIRST", type: "BAN", phase: "FINAL_BANS", baseDurationSeconds: 30 },
  { actor: "SECOND", type: "BAN", phase: "FINAL_BANS", baseDurationSeconds: 30 },
  { actor: "FIRST", type: "BAN", phase: "FINAL_BANS", baseDurationSeconds: 30 },
  { actor: "SECOND", type: "BAN", phase: "FINAL_BANS", baseDurationSeconds: 30 },
  { actor: "SECOND", type: "PICK", phase: "FINAL_PICKS", baseDurationSeconds: 30 },
  { actor: "FIRST", type: "PICK", phase: "FINAL_PICKS", baseDurationSeconds: 30 },
] as const;

export const DRAFT_QUEUE_TTL_SECONDS = 30;
export const DRAFT_INVITATION_TTL_MINUTES = 5;
