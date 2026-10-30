import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { seasonalCupPlayoffDateError } from "./seasonal-cup-schedule";
import { setSeasonTournamentRegistrationDeadline } from "./tournament-settings";
import { tournamentTimeline } from "./tournament-timeline";
import { tournamentCheckInWindow } from "./tournament-check-in";
import { formatTournamentStageDateRange } from "./tournament-date";

const dates = { tournament_type: "seasonal_cup", start_at: "2026-11-01T21:00:00Z",
  end_at: "2026-12-13T20:59:00Z", playoff_starts_on: "2026-11-30" };

describe("invitation cup stages", () => {
  it("shows two complete Moscow date ranges regardless of the first match", () => {
    const timeline = tournamentTimeline({ tournamentType: "seasonal_cup", startAt: dates.start_at,
      endAt: dates.end_at, playoffStartsOn: dates.playoff_starts_on,
      registrationDeadline: "2026-03-28T21:00:00Z", checkInMinutes: 60 });
    expect(timeline.map((stage) => [stage.label, formatTournamentStageDateRange(stage.at, stage.endAt!)])).toEqual([
      ["Групповой этап", "02.11 – 29.11"], ["Плей-офф", "30.11 – 13.12"],
    ]);
  });

  it("does not invent a playoff date for historical cups", () => {
    const timeline = tournamentTimeline({ tournamentType: "seasonal_cup", startAt: dates.start_at,
      registrationDeadline: dates.start_at, checkInMinutes: 60 });
    expect(timeline.map((stage) => stage.key)).toEqual(["start"]);
  });

  it.each(["2026-02-30", "2026-11-02", "2026-11-01", "2026-12-14", "wrong"])("rejects an impossible or overlapping stage boundary: %s", (value) => {
    expect(seasonalCupPlayoffDateError({ ...dates, playoff_starts_on: value })).not.toBe("");
  });

  it("accepts a saved boundary and clears legacy registration settings", () => {
    const body = { ...dates, registration_starts_at: "2026-01-01", registration_deadline: "old" };
    expect(seasonalCupPlayoffDateError(body)).toBe("");
    setSeasonTournamentRegistrationDeadline(body);
    expect(body.registration_starts_at).toBeNull();
    expect(body.registration_deadline).toBe(dates.start_at);
  });

  it("never opens check-in for a cup even at its first match", () => {
    expect(tournamentCheckInWindow({ tournamentType: "seasonal_cup", firstMatchAt: dates.start_at,
      checkInMinutes: 60, now: new Date("2026-11-01T20:30:00Z") })).toBeNull();
  });

  it("applies the requested dates only to the current league cup", async () => {
    const database = new PGlite();
    try {
      await database.exec(`CREATE TABLE tournaments (slug text, tournament_type text, start_at timestamptz,
        end_at timestamptz, registration_starts_at timestamptz, registration_deadline timestamptz, updated_at timestamptz);
        INSERT INTO tournaments(slug,tournament_type,start_at) VALUES
          ('league-cup-season-9','seasonal_cup','2026-01-01'),
          ('league-cup-season-8','seasonal_cup','2026-01-01'), ('fastcup','ordinary','2026-01-01');`);
      await database.exec(readFileSync(new URL("../../bot/database/migrations/0193_seasonal_cup_stage_dates.sql", import.meta.url), "utf8"));
      const result = await database.query<{ slug: string; start: string; playoff: string | null }>(
        "SELECT slug, (start_at AT TIME ZONE 'Europe/Moscow')::date::text AS start, playoff_starts_on::text AS playoff FROM tournaments ORDER BY slug");
      expect(result.rows).toEqual([
        { slug: "fastcup", start: "2026-01-01", playoff: null },
        { slug: "league-cup-season-8", start: "2026-01-01", playoff: null },
        { slug: "league-cup-season-9", start: "2026-11-02", playoff: "2026-11-30" },
      ]);
    } finally { await database.close(); }
  });
});
