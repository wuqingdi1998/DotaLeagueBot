import { describe, expect, it } from "vitest";
import { buildMatchResultPayload } from "../app/tournaments/[slug]/model/match-result-payload";
import type { TournamentMatch } from "../app/tournaments/[slug]/model/types";

const match: TournamentMatch = {
  id: 17,
  tournament_id: 3,
  group_id: null,
  scheduled_at: "2026-08-01T12:00:00.000Z",
  stage: "Финал",
  team_a: "Radiant",
  team_b: "Dire",
  team_a_application_id: 10,
  team_b_application_id: 11,
  team_a_placeholder: null,
  team_b_placeholder: null,
  team_a_score: null,
  team_b_score: null,
  result_type: "normal",
  team_a_result_label: null,
  team_b_result_label: null,
  decision_note: null,
  bracket_round: 1,
  bracket_side: "grand_final",
  bracket_slot: 1,
  bracket_grid_column: null,
  bracket_grid_row: null,
  eliminated_team_application_id: null,
  winner_to_match_id: null,
  winner_to_slot: null,
  loser_to_match_id: null,
  loser_to_slot: null,
  best_of: 5,
  sort_order: 0,
  status: "scheduled",
};

function baseForm() {
  const form = new FormData();
  form.set("scheduledAt", "2026-08-01T15:00");
  form.set("stage", "Финал");
  form.set("status", "finished");
  form.set("resultType", "normal");
  form.set("bestOf", "5");
  form.set("teamAId", "10");
  form.set("teamBId", "11");
  return form;
}

describe("match result payload", () => {
  it("uses null to clear optional match values", () => {
    const result = buildMatchResultPayload(baseForm(), match, 3);
    expect(result.error).toBeUndefined();
    expect(result.payload).toMatchObject({
      tournamentId: 3,
      scheduledAt: "2026-08-01T12:00:00.000Z",
      teamAScore: null,
      teamBScore: null,
      decisionNote: null,
      winnerToMatchId: null,
    });
  });

  it("rejects two eliminated teams in one match", () => {
    const form = baseForm();
    form.set("teamAEliminated", "on");
    form.set("teamBEliminated", "on");

    expect(buildMatchResultPayload(form, match, 3)).toEqual({
      error: "В одном матче можно отметить только одну выбывшую команду",
    });
  });
});
