import { describe, expect, it } from "vitest";
import {
  automaticBracketLayout,
  resolvedBracketLayout,
  type BracketLayoutMatch,
} from "./bracket-layout";

const matches: BracketLayoutMatch[] = [
  {
    id: 1,
    bracket_round: 1,
    bracket_slot: 1,
    bracket_side: "upper",
    bracket_grid_column: null,
    bracket_grid_row: null,
  },
  {
    id: 2,
    bracket_round: 1,
    bracket_slot: 2,
    bracket_side: "lower",
    bracket_grid_column: null,
    bracket_grid_row: null,
  },
  {
    id: 3,
    bracket_round: 2,
    bracket_slot: 1,
    bracket_side: "lower",
    bracket_grid_column: null,
    bracket_grid_row: null,
  },
  {
    id: 4,
    bracket_round: 3,
    bracket_slot: 1,
    bracket_side: "grand_final",
    bracket_grid_column: null,
    bracket_grid_row: null,
  },
];

describe("playoff bracket grid layout", () => {
  it("automatically separates rounds and vertically centers single matches", () => {
    expect(automaticBracketLayout(matches)).toEqual({
      1: { column: 1, row: 1 },
      2: { column: 1, row: 9 },
      3: { column: 19, row: 5 },
      4: { column: 37, row: 5 },
    });
  });

  it("uses a saved manual coordinate without changing other automatic cards", () => {
    expect(
      resolvedBracketLayout(
        matches.map((match) =>
          match.id === 3
            ? {
                ...match,
                bracket_grid_column: 19,
                bracket_grid_row: 8,
              }
            : match,
        ),
      ),
    ).toEqual({
      1: { column: 1, row: 1 },
      2: { column: 1, row: 9 },
      3: { column: 19, row: 8 },
      4: { column: 37, row: 5 },
    });
  });
});
