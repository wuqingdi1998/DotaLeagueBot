import { describe, expect, it } from "vitest";
import { setSeasonTournamentRegistrationDeadline } from "./tournament-settings";

describe("season tournament date normalization", () => {
  it("keeps the hidden deadline one day before the season start", () => {
    const tournament = {
      tournament_type: "seasonal",
      start_at: "2026-08-25T07:00:00.000Z",
      registration_deadline: "2026-09-06T18:00:00.000Z",
    };

    setSeasonTournamentRegistrationDeadline(tournament);

    expect(tournament.registration_deadline).toBe(
      "2026-08-24T07:00:00.000Z",
    );
  });

  it("does not change the deadline of an ordinary tournament", () => {
    const tournament = {
      tournament_type: "ordinary",
      start_at: "2026-08-25T07:00:00.000Z",
      registration_deadline: "2026-08-20T20:59:00.000Z",
    };

    setSeasonTournamentRegistrationDeadline(tournament);

    expect(tournament.registration_deadline).toBe(
      "2026-08-20T20:59:00.000Z",
    );
  });
});
