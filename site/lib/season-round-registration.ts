const registrationLeadMilliseconds = 24 * 60 * 60 * 1_000;

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
  const deadline = seasonRoundRegistrationDeadline(state.scheduledAt);
  const now = timestamp(state.now);
  return Boolean(
    deadline &&
      now !== null &&
      state.roundKind === "regular" &&
      ["planned", "active"].includes(state.roundStatus) &&
      ["registration", "active"].includes(state.tournamentStatus) &&
      now < new Date(deadline).getTime(),
  );
}
