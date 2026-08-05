import { describe, expect, it } from "vitest";
import {
  filterTournamentSummaries,
  type TournamentSummary,
} from "./tournament-hub-model";

function tournament(
  id: number,
  tournamentType: TournamentSummary["tournament_type"],
) {
  return {
    id,
    tournament_type: tournamentType,
  } as TournamentSummary;
}

describe("tournament directory filters", () => {
  const ordinary = tournament(1, "ordinary");
  const seasonal = tournament(2, "seasonal");

  it("shows every tournament in the default filter", () => {
    expect(filterTournamentSummaries([ordinary, seasonal], "all")).toEqual([
      ordinary,
      seasonal,
    ]);
  });

  it("shows only marked seasonal tournaments in the seasonal filter", () => {
    expect(
      filterTournamentSummaries([ordinary, seasonal], "seasonal"),
    ).toEqual([seasonal]);
  });
});
