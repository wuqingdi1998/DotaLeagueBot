import type { TournamentMatch } from "./types";

type MatchTeamAssignments = Pick<
  TournamentMatch,
  "team_a_application_id" | "team_b_application_id"
>;

export function shouldShowMatchReadiness(
  match: MatchTeamAssignments,
  isPast: boolean,
) {
  return (
    !isPast &&
    match.team_a_application_id !== null &&
    match.team_b_application_id !== null
  );
}
