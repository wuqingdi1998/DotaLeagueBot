const seasonRegistrationLeadMilliseconds = 24 * 60 * 60 * 1_000;

export function setSeasonTournamentRegistrationDeadline(
  tournament: Record<string, unknown>,
) {
  if (tournament.tournament_type !== "seasonal") return;

  const start = new Date(String(tournament.start_at ?? ""));
  tournament.registration_deadline = Number.isFinite(start.getTime())
    ? new Date(
        start.getTime() - seasonRegistrationLeadMilliseconds,
      ).toISOString()
    : "";
}
