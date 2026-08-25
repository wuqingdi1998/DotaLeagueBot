import { describe, expect, it } from "vitest";
import {
  canAcceptTournamentRegistration,
  isPastTournament,
  isPublicTournament,
  isUpcomingTournament,
  tournamentHasStarted,
} from "./tournaments";

describe("tournament lifecycle", () => {
  it("separates current and future events from the archive", () => {
    expect(isUpcomingTournament("planned")).toBe(true);
    expect(isUpcomingTournament("registration")).toBe(true);
    expect(isUpcomingTournament("active")).toBe(true);
    expect(isUpcomingTournament("archived")).toBe(false);
    expect(isPastTournament("finished")).toBe(true);
    expect(isPastTournament("archived")).toBe(true);
  });

  it("keeps drafts private while archived tournaments remain public", () => {
    expect(isPublicTournament("draft")).toBe(false);
    expect(isPublicTournament("planned")).toBe(true);
    expect(isPublicTournament("archived")).toBe(true);
  });

  it("reaches the tournament start at the exact configured moment", () => {
    const start = "2026-08-25T19:00:00.000Z";
    expect(tournamentHasStarted(start, Date.parse(start) - 1)).toBe(false);
    expect(tournamentHasStarted(start, Date.parse(start))).toBe(true);
  });

  it("accepts registrations only before the configured deadline", () => {
    const deadline = "2026-08-05T20:59:00.000Z";
    expect(
      canAcceptTournamentRegistration(
        "planned",
        deadline,
        Date.parse("2026-08-05T20:58:59.000Z"),
      ),
    ).toBe(false);
    expect(
      canAcceptTournamentRegistration(
        "registration",
        deadline,
        Date.parse("2026-08-05T20:58:59.000Z"),
      ),
    ).toBe(true);
    expect(
      canAcceptTournamentRegistration(
        "registration",
        deadline,
        Date.parse("2026-08-05T20:59:00.000Z"),
      ),
    ).toBe(false);
    expect(
      canAcceptTournamentRegistration(
        "archived",
        deadline,
        Date.parse("2025-08-05T20:59:00.000Z"),
      ),
    ).toBe(false);
  });
});
