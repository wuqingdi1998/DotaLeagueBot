import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const overview = source(
  "../app/tournaments/[slug]/sections/SeasonOverviewPanel.tsx",
);
const recentRound = source(
  "../app/tournaments/[slug]/sections/SeasonRecentCompletedRound.tsx",
);
const overviewModel = source(
  "../app/tournaments/[slug]/model/season-overview.ts",
);
const popover = source("../app/components/PlayerStatisticsPopover.tsx");
const styles = source("../app/styles/20-season-overview-results.css");
const popoverStyles = source("../app/styles/07-player-statistics-popover.css");

describe("season league overview", () => {
  it("fills the compact standings card with the top ten", () => {
    expect(overview).toContain(".slice(0, 10)");
    expect(overview).toContain("season-leaders-card");
    expect(styles).toContain("grid-template-rows: repeat(10, minmax(38px, 1fr))");
    expect(styles).toContain("height: 100%");
  });

  it("shows every lobby only from the latest fully completed public stage", () => {
    expect(overview).toContain("latestFullyCompletedSeasonRound");
    expect(overview).toContain("<SeasonRecentCompletedRound");
    expect(overviewModel).toContain('match.status === "completed"');
    expect(overviewModel).toContain("round.lobbies.length !== round.lobby_count");
    expect(overviewModel).toContain("isFullyCompletedFinals");
    expect(overviewModel).toContain('round.round_kind !== "finals"');
    expect(overviewModel).toContain('round.status !== "completed"');
    expect(recentRound).toContain("round.lobbies");
    expect(recentRound).toContain(".flatMap((lobby) => lobby.matches)");
    expect(recentRound).toContain("match.team_a_score");
    expect(recentRound).toContain("match.team_b_score");
  });

  it("renders five linked circular player avatars without service buttons", () => {
    expect(recentRound).toContain(".slice(0, 5)");
    expect(recentRound).toContain('seasonTeamLineupSlots(match, "a")');
    expect(recentRound).toContain('seasonTeamLineupSlots(match, "b")');
    expect(recentRound).toContain('profileHref={`/players/${dotaId}`}');
    expect(recentRound).not.toContain("buildPlayerLinks");
    expect(styles).not.toContain("season-recent-service-link");
    expect(styles).toMatch(
      /\.season-recent-player-avatar\s*\{[\s\S]*?border-radius: 50%;/,
    );
    expect(styles).toContain("grid-template-columns: repeat(5");
  });

  it("keeps compact lineups synchronized with substitutions", () => {
    expect(recentRound).toContain("season-recent-player-split");
    expect(recentRound).toContain('splitSide="first-map"');
    expect(recentRound).toContain('splitSide="second-map"');
    expect(recentRound).toContain('portalContainerSelector=".site-shell"');
    expect(styles).toMatch(
      /\.season-recent-player-split\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,/,
    );
    expect(popoverStyles).toContain("background: var(--surface, #0d2434)");
  });

  it("places STRATZ and Dotabuff map links beside every lobby name", () => {
    expect(recentRound).toContain("seasonMatchLinks(game.dota_match_id)");
    expect(recentRound).toContain("match.games");
    expect(recentRound).toContain("game?.game_number");
    expect(recentRound).toContain('service="stratz"');
    expect(recentRound).toContain('service="dotabuff"');
    expect(recentRound).toContain("links?.stratz");
    expect(recentRound).toContain("links?.dotaBuff");
    expect(styles).toContain("season-recent-map-links");
  });

  it("reuses the six Fearless Draft statistics on hover", () => {
    expect(recentRound).toContain("<PlayerStatisticsPopover");
    expect(popover).toContain("onMouseEnter: showStatistics");
    expect(popover).toContain("Турниров");
    expect(popover).toContain("Побед в турнирах");
    expect(popover).toContain("Призовых мест");
    expect(popover).toContain("Победный процент");
    expect(popoverStyles).not.toMatch(/font-size:\s*(?:[0-9]|1[0-2])px/);
  });
});
