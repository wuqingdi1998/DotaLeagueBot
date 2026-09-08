import { describe, expect, it } from "vitest";
import {
  filterTournamentSummaries,
  toTournamentIso,
  type TournamentSummary,
} from "./tournament-hub-model";
import type { TournamentStatus } from "@/lib/tournaments";

function tournament(
  id: number,
  tournamentType: TournamentSummary["tournament_type"],
  status: TournamentStatus = "active",
) {
  return {
    id,
    tournament_type: tournamentType,
    status,
  } as TournamentSummary;
}

describe("tournament directory filters", () => {
  const ordinary = tournament(1, "ordinary");
  const seasonal = tournament(2, "seasonal");
  const seasonalCup = tournament(3, "seasonal_cup");

  it("shows every tournament in the default filter", () => {
    expect(
      filterTournamentSummaries([ordinary, seasonal, seasonalCup], "all"),
    ).toEqual([ordinary, seasonal, seasonalCup]);
  });

  it("shows only marked seasonal tournaments in the seasonal filter", () => {
    expect(
      filterTournamentSummaries(
        [ordinary, seasonal, seasonalCup],
        "seasonal",
      ),
    ).toEqual([seasonal, seasonalCup]);
  });

  it("hides archived tournaments when the checkbox is selected", () => {
    const archived = tournament(4, "ordinary", "archived");

    expect(
      filterTournamentSummaries(
        [ordinary, archived, seasonal],
        "all",
        true,
      ),
    ).toEqual([ordinary, seasonal]);
  });

  it("combines the archive checkbox with the seasonal filter", () => {
    const archivedSeasonal = tournament(4, "seasonal", "archived");

    expect(
      filterTournamentSummaries(
        [ordinary, seasonal, archivedSeasonal, seasonalCup],
        "seasonal",
        true,
      ),
    ).toEqual([seasonal, seasonalCup]);
  });

  it("treats organizer form values as Moscow time", () => {
    expect(toTournamentIso("2026-08-25T22:00")).toBe(
      "2026-08-25T19:00:00.000Z",
    );
  });
});
