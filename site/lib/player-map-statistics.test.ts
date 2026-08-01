import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mapWinRatePercent } from "./player-map-statistics";

const source = readFileSync(
  new URL("./player-map-statistics.ts", import.meta.url),
  "utf8",
);
const profilePage = readFileSync(
  new URL("../app/players/[dotaId]/page.tsx", import.meta.url),
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
    expect(source).toContain("game.id AS game_id");
    expect(source).toContain("ordinary_statistics.maps + seasonal_statistics.maps");
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
});
