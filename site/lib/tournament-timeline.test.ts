import { describe, expect, it } from "vitest";
import { tournamentTimeline } from "./tournament-timeline";

describe("tournament overview timeline", () => {
  it("shows exactly registration, check-in and tournament start", () => {
    const timeline = tournamentTimeline({
      registrationDeadline: "2026-08-09T18:00:00+03:00",
      startAt: "2026-08-10T18:00:00+03:00",
      checkInMinutes: 30,
    });

    expect(timeline.map((item) => item.label)).toEqual([
      "Регистрация до",
      "Чек-ин",
      "Старт турнира",
    ]);
  });

  it("calculates check-in from the configured minutes before start", () => {
    const timeline = tournamentTimeline({
      registrationDeadline: "2026-08-09T18:00:00+03:00",
      startAt: "2026-08-10T00:15:00+03:00",
      checkInMinutes: 30,
    });

    expect(timeline[1].at).toBe("2026-08-09T20:45:00.000Z");
  });
});
