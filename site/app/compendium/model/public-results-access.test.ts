import { describe, expect, it } from "vitest";
import { archivedCompendiumDestination } from "./public-results-access";
import { OCTOBER_RESULTS_ARCHIVE_AT, areOctoberResultsArchived } from "@/lib/october-compendium-schedule";
import { dailyResetCountdownLabel } from "./countdown";

describe("October results archive deadline", () => {
  it("keeps public results available until Saturday at 21:00 Moscow time", () => {
    expect(areOctoberResultsArchived(new Date("2026-10-31T20:59:59.999+03:00"))).toBe(false);
    expect(archivedCompendiumDestination(false, new Date("2026-10-31T20:59:59+03:00"))).toBeNull();
  });
  it.each(["2026-10-31T18:00:00Z", "2026-11-01T09:00:00+03:00"])("moves the page to archive at %s", (value) => {
    const now = new Date(value);
    expect(areOctoberResultsArchived(now)).toBe(true);
    expect(archivedCompendiumDestination(true, now)).toBe("/organizer/compendium-october/results");
    expect(archivedCompendiumDestination(false, now)).toBe("/");
  });
  it("shows total remaining hours and stops at zero", () => {
    expect(dailyResetCountdownLabel(OCTOBER_RESULTS_ARCHIVE_AT, Date.parse("2026-10-28T21:00:00+03:00"))).toBe("72:00:00");
    expect(dailyResetCountdownLabel(OCTOBER_RESULTS_ARCHIVE_AT, Date.parse("2026-10-31T20:59:59+03:00"))).toBe("00:00:01");
    expect(dailyResetCountdownLabel(OCTOBER_RESULTS_ARCHIVE_AT, Date.parse("2026-11-01T21:00:00+03:00"))).toBe("00:00:00");
  });
});
