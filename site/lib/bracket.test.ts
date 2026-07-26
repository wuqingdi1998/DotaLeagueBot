import { describe, expect, it } from "vitest";
import { bracketEliminatedTeamKey, bracketOutcomeKeys } from "./bracket";

const baseMatch = {
  team_a: "Radiant",
  team_b: "Dire",
  team_a_application_id: 10,
  team_b_application_id: 20,
  team_a_score: null,
  team_b_score: null,
  team_a_result_label: null,
  team_b_result_label: null,
};

describe("playoff bracket outcomes", () => {
  it("follows a normal score into winner and loser links", () => {
    expect(
      bracketOutcomeKeys({
        ...baseMatch,
        team_a_score: 2,
        team_b_score: 1,
      }),
    ).toEqual({ winner: "id:10", loser: "id:20" });
  });

  it("understands technical win and loss labels", () => {
    expect(
      bracketOutcomeKeys({
        ...baseMatch,
        team_a_result_label: "tl",
        team_b_result_label: "tw",
      }),
    ).toEqual({ winner: "id:20", loser: "id:10" });
  });

  it("does not highlight an unresolved route", () => {
    expect(bracketOutcomeKeys(baseMatch)).toEqual({
      winner: null,
      loser: null,
    });
  });
});

describe("playoff eliminations", () => {
  it("marks the selected participant as eliminated", () => {
    expect(
      bracketEliminatedTeamKey({
        ...baseMatch,
        eliminated_team_application_id: 20,
      }),
    ).toBe("id:20");
  });

  it("ignores an application that is not in the match", () => {
    expect(
      bracketEliminatedTeamKey({
        ...baseMatch,
        eliminated_team_application_id: 30,
      }),
    ).toBeNull();
  });
});
