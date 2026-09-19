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

  it("shows every lobby only from the latest fully completed public round", () => {
    expect(overview).toContain("latestFullyCompletedSeasonRound");
    expect(overview).toContain("<SeasonRecentCompletedRound");
    expect(overviewModel).toContain('match.status === "completed"');
    expect(overviewModel).toContain("round.lobbies.length !== round.lobby_count");
    expect(recentRound).toContain("round.lobbies");
    expect(recentRound).toContain(".flatMap((lobby) => lobby.matches)");
    expect(recentRound).toContain("match.team_a_score");
    expect(recentRound).toContain("match.team_b_score");
  });

  it("renders five linked circular avatars per team with profile services", () => {
    expect(recentRound).toContain(".slice(0, 5)");
    expect(recentRound).toContain('player.team_side === "a"');
    expect(recentRound).toContain('player.team_side === "b"');
    expect(recentRound).toContain('profileHref={`/players/${dotaId}`}');
    expect(recentRound).toContain('service="stratz"');
    expect(recentRound).toContain('service="dotabuff"');
    expect(styles).toMatch(
      /\.season-recent-player-avatar\s*\{[\s\S]*?border-radius: 50%;/,
    );
    expect(styles).toContain("grid-template-columns: repeat(5");
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
