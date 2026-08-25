const registrationLeadMilliseconds = 10 * 60 * 1_000;
const cancellationLeadMilliseconds = 24 * 60 * 60 * 1_000;
const checkInLeadMilliseconds = 2 * 60 * 60 * 1_000;

export const seasonTierConfirmationMessage =
  "Отправьте полный скриншот страницы с MMR и последними матчами организатору — @frokeng";

type SeasonRoundRegistrationState = {
  readonly scheduledAt: string | Date | null;
  readonly now: string | Date;
  readonly roundKind: "regular" | "finals";
  readonly roundStatus: "planned" | "active" | "completed" | "cancelled";
  readonly tournamentStatus: TournamentStatus;
};

function timestamp(value: string | Date | null): number | null {
  if (!value) return null;
  const result = new Date(value).getTime();
  return Number.isFinite(result) ? result : null;
}

function seasonRoundAllowsRegistration(
  state: SeasonRoundRegistrationState,
): boolean {
  return (
    state.roundKind === "regular" &&
    ["planned", "active"].includes(state.roundStatus) &&
    ["registration", "active"].includes(state.tournamentStatus)
  );
}

export function seasonRoundCheckInIsAvailable(
  state: SeasonRoundRegistrationState,
): boolean {
  return (
    seasonRoundAllowsRegistration(state) &&
    timestamp(state.scheduledAt) !== null
  );
}

export function seasonRoundRegistrationDeadline(
  scheduledAt: string | Date | null,
): string | null {
  const start = timestamp(scheduledAt);
  return start === null
    ? null
    : new Date(start - registrationLeadMilliseconds).toISOString();
}

export function seasonRoundCancellationDeadline(
  scheduledAt: string | Date | null,
): string | null {
  const start = timestamp(scheduledAt);
  return start === null
    ? null
    : new Date(start - cancellationLeadMilliseconds).toISOString();
}

export function seasonRoundCheckInWindow(
  scheduledAt: string | Date | null,
): { opensAt: string; closesAt: string } | null {
  const start = timestamp(scheduledAt);
  if (start === null) return null;
  return {
    opensAt: new Date(start - checkInLeadMilliseconds).toISOString(),
    closesAt: new Date(start - registrationLeadMilliseconds).toISOString(),
  };
}

export function seasonRoundRegistrationGetsAutomaticCheckIn(
  scheduledAt: string | Date | null,
  now: string | Date,
): boolean {
  const start = timestamp(scheduledAt);
  const current = timestamp(now);
  return Boolean(
    start !== null &&
      current !== null &&
      current >= start - checkInLeadMilliseconds &&
      current < start,
  );
}

export function seasonRoundRegistrationIsOpen(
  state: SeasonRoundRegistrationState,
): boolean {
  const deadline = seasonRoundRegistrationDeadline(state.scheduledAt);
  const now = timestamp(state.now);
  return Boolean(
    deadline &&
      now !== null &&
      seasonRoundAllowsRegistration(state) &&
      now < new Date(deadline).getTime(),
  );
}

export function seasonRoundCancellationIsOpen(
  state: SeasonRoundRegistrationState,
): boolean {
  const deadline = seasonRoundCancellationDeadline(state.scheduledAt);
  const now = timestamp(state.now);
  return Boolean(
    deadline &&
      now !== null &&
      seasonRoundAllowsRegistration(state) &&
      now < new Date(deadline).getTime(),
  );
}

export function seasonRoundCheckInIsOpen(
  state: SeasonRoundRegistrationState,
): boolean {
  const window = seasonRoundCheckInWindow(state.scheduledAt);
  const now = timestamp(state.now);
  return Boolean(
    window &&
      now !== null &&
      seasonRoundCheckInIsAvailable(state) &&
      now >= new Date(window.opensAt).getTime() &&
      now < new Date(window.closesAt).getTime(),
  );
}
import type { TournamentStatus } from "@/lib/tournaments";
