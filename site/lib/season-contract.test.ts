import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadSiteStyles } from "./test-utils/load-styles";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const createRoute = source("../app/api/tournament/tournament-create.ts");
const publicRoute = source("../app/api/season/route.ts");
const adminRoute = source("../app/api/admin/season/route.ts");
const navigation = source(
  "../app/tournaments/[slug]/sections/TournamentNavigation.tsx",
);
const standings = source(
  "../app/tournaments/[slug]/sections/SeasonStandingsPanel.tsx",
);
const rounds = source(
  "../app/tournaments/[slug]/sections/SeasonRoundsPanel.tsx",
);
const styles = loadSiteStyles();

describe("season creation and access contract", () => {
  it("creates the requested empty rounds and keeps ordinary as the default", () => {
    expect(createRoute).toContain(
      'String(body.tournament_type ?? "ordinary")',
    );
    expect(createRoute).toMatch(/generate_series\(1, \$2::int\)/);
    expect(createRoute).toMatch(/validSeasonRoundCount\(seasonRoundCount\)/);
  });

  it("filters hidden rounds and draft matches on the server", () => {
    expect(publicRoute).toContain("AND round.is_visible = TRUE");
    expect(publicRoute).toContain(
      "AND match.status IN ('published', 'completed')",
    );
    expect(publicRoute).toContain(
      "AND game.status IN ('published', 'completed')",
    );
    expect(publicRoute).toContain('error: "Тур не найден"');
  });

  it("protects every season write operation with organizer access", () => {
    expect(adminRoute.match(/await requireAdmin\(\)/g)).toHaveLength(3);
    expect(adminRoute).toContain("const admin = await requireAdmin()");
  });
});

describe("season interface contract", () => {
  it("reuses the tournament navigation and replaces ordinary tabs", () => {
    expect(navigation).toContain(
      'className="tabs tournament-tabs season-tournament-tabs"',
    );
    for (const label of ["Обзор", "Таблица", "Туры", "Управление"]) {
      expect(navigation).toContain(label);
    }
    expect(navigation).toContain("season.data?.rounds");
  });

  it("supports long round navigation and scrolls to the active round", () => {
    expect(navigation).toContain("scrollIntoView");
    expect(navigation).toContain("scrollBy");
    expect(styles).toMatch(
      /\.season-round-tabs\s*\{[^}]*overflow-x:\s*auto;[^}]*overflow-y:\s*hidden;/,
    );
    expect(styles).toMatch(
      /\.season-round-tabs button\s*\{[^}]*white-space:\s*nowrap;/,
    );
  });

  it("keeps the player column visible and opens a result's match", () => {
    expect(styles).toMatch(
      /\.season-standings-table \.season-player-column\s*\{[^}]*position:\s*sticky;/,
    );
    expect(standings).toContain("cell.matchIds[0]");
    expect(standings).toContain("season.openRound");
  });

  it("creates safe external links only when a map has a match id", () => {
    expect(rounds).toContain('target="_blank"');
    expect(rounds).toContain('rel="noopener noreferrer"');
    expect(rounds).toContain("seasonMatchLinks");
  });
});
