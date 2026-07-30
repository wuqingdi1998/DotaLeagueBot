import { describe, expect, it } from "vitest";
import {
  formatTournamentCompactDateRange,
  formatTournamentDateRange,
  formatTournamentDayMonthRange,
  formatTournamentShortDateRange,
} from "./tournament-date";

describe("tournament date ranges", () => {
  const start = "2026-08-01T10:00:00+03:00";
  const sameDayEnd = "2026-08-01T22:00:00+03:00";
  const nextDayEnd = "2026-08-02T22:00:00+03:00";

  it("shows one date when a tournament starts and ends on the same day", () => {
    expect(formatTournamentDateRange(start, sameDayEnd)).not.toContain("—");
    expect(formatTournamentDayMonthRange(start, sameDayEnd)).toBe("1 августа");
    expect(formatTournamentShortDateRange(start, sameDayEnd)).toBe(
      "01.08.2026",
    );
    expect(formatTournamentCompactDateRange(start, sameDayEnd)).not.toContain(
      "—",
    );
  });

  it("keeps a date range for multi-day tournaments", () => {
    expect(formatTournamentDateRange(start, nextDayEnd)).toContain("—");
    expect(formatTournamentDayMonthRange(start, nextDayEnd)).toBe(
      "1 августа — 2 августа",
    );
    expect(formatTournamentShortDateRange(start, nextDayEnd)).toBe(
      "01.08.2026 — 02.08.2026",
    );
    expect(formatTournamentCompactDateRange(start, nextDayEnd)).toContain("—");
  });
});
