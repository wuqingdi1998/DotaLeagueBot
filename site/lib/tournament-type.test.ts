import { describe, expect, it } from "vitest";
import {
  isSeasonLeague,
  isSeasonalTournament,
  isTeamTournament,
} from "./tournament-type";

describe("tournament types", () => {
  it("marks both the league and the cup as seasonal", () => {
    expect(isSeasonalTournament("ordinary")).toBe(false);
    expect(isSeasonalTournament("seasonal")).toBe(true);
    expect(isSeasonalTournament("seasonal_cup")).toBe(true);
  });

  it("keeps the seasonal cup on the team tournament screens", () => {
    expect(isSeasonLeague("seasonal_cup")).toBe(false);
    expect(isTeamTournament("seasonal_cup")).toBe(true);
    expect(isSeasonLeague("seasonal")).toBe(true);
  });
});
