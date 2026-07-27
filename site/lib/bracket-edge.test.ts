import { describe, expect, it } from "vitest";
import {
  buildBracketEdges,
  type BracketMatch,
} from "../app/tournaments/[slug]/components/bracket/bracket-model";

function match(overrides: Partial<BracketMatch>): BracketMatch {
  return {
    id: 1,
    team_a: "Last Dance",
    team_b: "SashiMi",
    team_a_application_id: 10,
    team_b_application_id: 20,
    team_a_score: null,
    team_b_score: null,
    team_a_result_label: null,
    team_b_result_label: null,
    decision_note: null,
    best_of: 1,
    status: "finished",
    bracket_round: 1,
    bracket_side: "upper",
    bracket_slot: 1,
    bracket_grid_column: null,
    bracket_grid_row: null,
    eliminated_team_application_id: null,
    winner_to_match_id: null,
    winner_to_slot: null,
    loser_to_match_id: null,
    loser_to_slot: null,
    ...overrides,
  };
}

describe("connected bracket routes", () => {
  it("starts winner and loser arrows from the actual team rows", () => {
    const edges = buildBracketEdges([
      match({
        team_a_result_label: "FF",
        team_b_result_label: "W",
        winner_to_match_id: 3,
        winner_to_slot: "a",
        loser_to_match_id: 2,
        loser_to_slot: "a",
      }),
      match({
        id: 2,
        team_a: "Last Dance",
        team_b: "Lower opponent",
        team_a_application_id: 10,
        team_b_application_id: 30,
        bracket_side: "lower",
        bracket_round: 2,
      }),
      match({
        id: 3,
        team_a: "SashiMi",
        team_b: "Final opponent",
        team_a_application_id: 20,
        team_b_application_id: 40,
        bracket_side: "grand_final",
        bracket_round: 3,
      }),
    ]);

    expect(edges).toEqual([
      expect.objectContaining({
        outcome: "winner",
        sourceSlot: "b",
        targetId: 3,
        teamKey: "id:20",
      }),
      expect.objectContaining({
        outcome: "loser",
        sourceSlot: "a",
        targetId: 2,
        teamKey: "id:10",
      }),
    ]);
  });

  it("keeps a route highlightable when the result is not filled but the target is", () => {
    const [edge] = buildBracketEdges([
      match({ winner_to_match_id: 3, winner_to_slot: "a" }),
      match({
        id: 3,
        team_a: "SashiMi",
        team_b: "Final opponent",
        team_a_application_id: 20,
        team_b_application_id: 40,
        bracket_side: "grand_final",
        bracket_round: 3,
      }),
    ]);

    expect(edge).toEqual(
      expect.objectContaining({
        sourceSlot: "b",
        teamKey: "id:20",
      }),
    );
  });
});
