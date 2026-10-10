import type { StarRaceQuestRequirement } from "./star-race";

export const VERIFICATION_RETRY_MINUTES = [2, 4, 6, 8, 10, 20, 30, 40, 50, 60, 120] as const;
export const VERIFICATION_LEASE_SECONDS = 180;
export type VerificationKind = "daily" | "rune" | "clan_outing" | "star_race";
export type VerificationSnapshot = {
  kind: VerificationKind;
  dateKey: string;
  questId: string;
  title: string;
  dotaId: string;
  rewardStars: number;
  startsAt: string;
  endsAt: string;
  heroIds: number[];
  clanMates: { playerId: string; dotaId: string }[];
  requirement: StarRaceQuestRequirement | null;
};
export type VerificationRequest = {
  id: string;
  playerId: string;
  playerName: string;
  snapshot: VerificationSnapshot;
  status: "pending" | "completed" | "exhausted" | "cancelled";
  startedAt: string;
  nextAttemptAt: string | null;
  attempts: number;
  manualAttempts: number;
  lastError: string | null;
  notifiedAt: string | null;
  isChecking?: boolean;
};

/** Deadlines stay anchored to the original failure, including after extra player checks. */
export function nextVerificationAttempt(startedAt: string, now: Date): { at: string; index: number } | null {
  const start = Date.parse(startedAt);
  const index = VERIFICATION_RETRY_MINUTES.findIndex((minute) => start + minute * 60_000 > now.getTime());
  return index < 0 ? null : { at: new Date(start + VERIFICATION_RETRY_MINUTES[index] * 60_000).toISOString(), index };
}
