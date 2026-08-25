import { moscowDateTimeInputToIso } from "../../../../lib/moscow-date-time";
import type { TournamentMatch } from "./types";

type MatchResultPayload =
  | { error: string; payload?: never }
  | { error?: never; payload: Record<string, unknown> };

/**
 * Converts the organizer form into the exact server payload.
 * Empty form fields deliberately become `null`, because the server uses `null`
 * to clear a previously saved score, label or bracket connection.
 */
export function buildMatchResultPayload(
  form: FormData,
  match: TournamentMatch,
  tournamentId: number,
): MatchResultPayload {
  const text = (field: string) => String(form.get(field) ?? "").trim();
  const optionalNumber = (field: string) =>
    text(field) ? Number(text(field)) : null;
  const optionalText = (field: string) => text(field) || null;
  const teamAEliminated = form.get("teamAEliminated") === "on";
  const teamBEliminated = form.get("teamBEliminated") === "on";

  if (teamAEliminated && teamBEliminated) {
    return {
      error: "В одном матче можно отметить только одну выбывшую команду",
    };
  }

  const teamAId = text("teamAId");
  const teamBId = text("teamBId");
  const eliminatedTeamId = teamAEliminated
    ? Number(teamAId) || null
    : teamBEliminated
      ? Number(teamBId) || null
      : null;

  return {
    payload: {
      id: match.id,
      tournamentId,
      status: text("status"),
      groupId: optionalNumber("groupId"),
      scheduledAt: moscowDateTimeInputToIso(text("scheduledAt")),
      stage: text("stage"),
      teamAId: teamAId ? Number(teamAId) : null,
      teamBId: teamBId ? Number(teamBId) : null,
      teamAPlaceholder: optionalText("teamAPlaceholder"),
      teamBPlaceholder: optionalText("teamBPlaceholder"),
      bestOf: Number(form.get("bestOf")),
      sortOrder: match.sort_order,
      teamAScore: optionalNumber("teamAScore"),
      teamBScore: optionalNumber("teamBScore"),
      resultType: text("resultType"),
      teamAResultLabel: optionalText("teamAResultLabel"),
      teamBResultLabel: optionalText("teamBResultLabel"),
      decisionNote: optionalText("decisionNote"),
      bracketRound: optionalNumber("bracketRound"),
      bracketSide: optionalText("bracketSide"),
      bracketSlot: optionalNumber("bracketSlot"),
      winnerToMatchId: optionalNumber("winnerToMatchId"),
      winnerToSlot: optionalText("winnerToSlot"),
      loserToMatchId: optionalNumber("loserToMatchId"),
      loserToSlot: optionalText("loserToSlot"),
      eliminatedTeamId,
    },
  };
}
