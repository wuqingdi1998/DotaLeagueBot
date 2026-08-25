export const tournamentStatuses = [
  "draft",
  "planned",
  "registration",
  "active",
  "finished",
  "archived",
] as const;

export type TournamentStatus = (typeof tournamentStatuses)[number];

export function isTournamentStatus(value: unknown): value is TournamentStatus {
  return tournamentStatuses.includes(value as TournamentStatus);
}

export function isPastTournament(status: TournamentStatus) {
  return status === "finished" || status === "archived";
}

export function isUpcomingTournament(status: TournamentStatus) {
  return (
    status === "draft" ||
    status === "planned" ||
    status === "registration" ||
    status === "active"
  );
}

export function isPublicTournament(status: TournamentStatus) {
  return status !== "draft";
}

export function canAcceptTournamentRegistration(
  status: TournamentStatus,
  registrationDeadline: string,
  now: number,
) {
  return (
    status === "registration" &&
    new Date(registrationDeadline).getTime() > now
  );
}
