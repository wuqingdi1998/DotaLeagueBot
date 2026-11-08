import { describe, expect, it } from "vitest";
import { tournamentTimeline } from "./tournament-timeline";

describe("tournament overview timeline", () => {
  it("omits unspecified registration, check-in and hidden start without placeholders", () => {
    expect(tournamentTimeline({ registrationDeadline: null, checkInMinutes: null,
      startAt: "2026-06-26T20:00:00+03:00", showStart: false })).toEqual([]);
    expect(tournamentTimeline({ registrationDeadline: null, checkInMinutes: null,
      startAt: "2026-06-26T20:00:00+03:00" }).map((s) => s.key)).toEqual(["start"]);
  });

  it("keeps an explicitly supplied deadline when the start is hidden", () => {
    expect(tournamentTimeline({ registrationDeadline: "2026-06-25T20:00:00+03:00",
      checkInMinutes: null, startAt: "2026-06-26T20:00:00+03:00", showStart: false })
      .map((s) => s.key)).toEqual(["registration"]);
  });

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
