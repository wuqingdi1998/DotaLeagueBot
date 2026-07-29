import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const route = source("../app/api/admin/tournament-clone/route.ts");
const panel = source(
  "../app/tournaments/[slug]/admin/TournamentClonePanel.tsx",
);

describe("tournament clone contract", () => {
  it("copies only settings, schedule, rules and prize text", () => {
    expect(route).toContain("FROM tournament_rules");
    expect(route).toContain("FROM tournament_prizes");
    expect(route).toContain("FROM tournament_schedule_days");
    expect(route).toContain("FROM tournament_schedule_entries");
    expect(route).not.toContain("tournament_team_applications");
    expect(route).not.toContain("tournament_roster_snapshots");
    expect(route).not.toContain("tournament_matches");
    expect(route).not.toContain("season_match_participants");
    expect(route).not.toContain("season_lobbies");
    expect(route).not.toContain("season_finalists");
  });

  it("creates an unpublished draft and clears prize winners", () => {
    expect(route).toContain("discord_url, 'draft'");
    expect(route).toMatch(
      /INSERT INTO tournament_prizes \(\s*tournament_id, placement, prize_text/,
    );
  });

  it("explains the clone scope before the administrator confirms", () => {
    expect(panel).toContain("Команды, составы, тиры, матчи и результаты");
    expect(panel).toContain("window.confirm");
  });
});
