const registrationLeadMilliseconds = 24 * 60 * 60 * 1_000;

export const seasonTierConfirmationMessage =
  "Отправьте полный скриншот страницы с MMR и последними матчами организатору — @frokeng";

type SeasonRoundRegistrationState = {
  readonly scheduledAt: string | Date | null;
  readonly now: string | Date;
  readonly roundKind: "regular" | "finals";
  readonly roundStatus: "planned" | "active" | "completed" | "cancelled";
  readonly tournamentStatus:
    | "draft"
    | "registration"
    | "active"
    | "finished"
    | "archived";
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

export function seasonRoundRegistrationDeadline(
  scheduledAt: string | Date | null,
): string | null {
  const start = timestamp(scheduledAt);
  return start === null
    ? null
    : new Date(start - registrationLeadMilliseconds).toISOString();
}

export function seasonRoundRegistrationIsOpen(
  state: SeasonRoundRegistrationState,
): boolean {
  const start = timestamp(state.scheduledAt);
  const now = timestamp(state.now);
  return Boolean(
    start !== null &&
      now !== null &&
      seasonRoundAllowsRegistration(state) &&
      now < start,
  );
}

export function seasonRoundCancellationIsOpen(
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
