export type TournamentStatus =
  | "draft"
  | "registration"
  | "active"
  | "finished"
  | "archived";

export function isPastTournament(status: TournamentStatus) {
  return status === "finished" || status === "archived";
}

export function isUpcomingTournament(status: TournamentStatus) {
  return status === "draft" || status === "registration" || status === "active";
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
