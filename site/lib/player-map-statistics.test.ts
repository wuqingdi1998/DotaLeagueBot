import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  mapWinRatePercent,
  totalPlayerMapStatistics,
} from "./player-map-statistics";

const source = readFileSync(
  new URL("./player-map-statistics.ts", import.meta.url),
  "utf8",
);
const profilePage = readFileSync(
  new URL("../app/players/[dotaId]/page.tsx", import.meta.url),
  "utf8",
);
const organizerDialog = readFileSync(
  new URL("../app/players/[dotaId]/PlayerMapStatisticsDialog.tsx", import.meta.url),
  "utf8",
);

describe("player map statistics", () => {
  it("calculates win rate from won maps rather than match wins", () => {
    expect(mapWinRatePercent({ maps: 3, mapWins: 2 })).toBe(67);
    expect(mapWinRatePercent({ maps: 2, mapWins: 1 })).toBe(50);
    expect(mapWinRatePercent({ maps: 0, mapWins: 0 })).toBe(0);
  });

  it("combines ordinary tournament maps with seasonal league maps", () => {
    expect(source).toContain("FROM tournament_matches ordinary_match");
    expect(source).toContain("FROM season_match_participants participant");
    expect(source).toContain("season_match_substitutions");
    expect(source).toContain("game.id AS contribution_id");
    expect(source).toContain("FROM all_contributions");
  });

  it("uses legacy standings only when detailed regular matches are absent", () => {
    expect(source).toContain("season_snapshot_contributions");
    expect(source).toContain("standings_snapshot->>'playedRounds'");
    expect(source).toContain("standings_snapshot->>'wins'");
    expect(source).toContain("standings_snapshot->>'draws'");
    expect(source).toContain("season_actual_regular_tournaments");
    expect(source).toContain("round_kind <> 'finals'");
  });

  it("builds profile totals from the per-tournament breakdown", () => {
    expect(
      totalPlayerMapStatistics([
        { tournamentId: 3, tournamentName: "Season 3", maps: 24, mapWins: 12 },
        { tournamentId: 7, tournamentName: "Season 7", maps: 8, mapWins: 7 },
      ]),
    ).toEqual({ maps: 32, mapWins: 19 });
  });

  it("uses both sides of a completed score as played maps", () => {
    expect(source).toContain("team_a_score + ordinary_match.team_b_score");
    expect(source).toContain("team_a_score + season_match.team_b_score");
  });

  it("labels profile totals as maps", () => {
    expect(profilePage).toContain("<span>Карт</span>");
    expect(profilePage).toContain("<span>Побед на картах</span>");
    expect(profilePage).not.toContain("<span>Матчей</span>");
  });

  it("shows the tournament map breakdown only to an organizer", () => {
    expect(profilePage).toContain("user?.isAdmin ? (");
    expect(profilePage).toContain("<PlayerMapStatisticsDialog");
    expect(organizerDialog).toContain("tournament.maps");
    expect(organizerDialog).toContain("tournament.mapWins");
    expect(organizerDialog).not.toContain("winRatePercent");
  });
});
