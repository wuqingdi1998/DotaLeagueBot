import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const activityMigration = source(
  "../../bot/database/migrations/0027_season_activity_points.sql",
);
const historicalMigration = source(
  "../../bot/database/migrations/0028_historical_league_seasons.sql",
);
const winRateCleanup = source(
  "../../bot/database/migrations/0029_historical_win_rate_cleanup.sql",
);
const historicalSuspensions = source(
  "../../bot/database/migrations/0035_historical_season_suspensions.sql",
);
const profileLink = source("../app/components/PlayerProfileLink.tsx");
const standings = source(
  "../app/tournaments/[slug]/sections/SeasonStandingsPanel.tsx",
);
const overview = source(
  "../app/tournaments/[slug]/sections/SeasonOverviewPanel.tsx",
);
const seasonRoute = source("../app/api/season/route.ts");

describe("historical seasonal leagues", () => {
  it("imports all four seasons as seasonal archives", () => {
    for (const season of [4, 5, 6, 7]) {
      expect(historicalMigration).toContain(`league-season-${season}`);
    }
    expect(historicalMigration).toContain("'archived', 'seasonal', 14");
  });

  it("stores activity points separately from manual p", () => {
    expect(activityMigration).toContain("adjustment_kind");
    expect(activityMigration).toContain("'manual', 'activity'");
    expect(historicalMigration).toContain(
      "Базовые очки активности +ap из Excel",
    );
    expect(standings).toContain("<th className=\"season-compact-column\">+ap");
  });

  it("preserves the Excel order and historical tier snapshots", () => {
    expect(activityMigration).toContain("rank_snapshot");
    expect(activityMigration).toContain("standings_snapshot");
    expect(historicalMigration).toContain("tier_snapshot");
    expect(historicalMigration).toContain(
      "rank_snapshot = EXCLUDED.rank_snapshot",
    );
    expect(seasonRoute).toContain(
      "participant.standings_snapshot IS NOT NULL",
    );
    expect(overview).toContain(
      '.filter((row) => row.section === "active")',
    );
  });

  it("removes Excel error codes from historical win rates", () => {
    expect(winRateCleanup).toContain(
      "participant.standings_snapshot->>'winRate'",
    );
    expect(winRateCleanup).toContain("::numeric < 0");
    expect(winRateCleanup).toContain("::numeric > 1");
  });

  it("preserves every gray penalty suspension from the Excel standings", () => {
    const match = historicalSuspensions.match(
      /\$suspensions\$([\s\S]*?)\$suspensions\$::jsonb/,
    );
    expect(match).not.toBeNull();
    const suspensions = JSON.parse(match?.[1] ?? "[]") as Array<{
      season: number;
      nickname: string;
      rounds: number[];
    }>;

    expect(suspensions).toHaveLength(30);
    expect(
      suspensions.reduce((total, entry) => total + entry.rounds.length, 0),
    ).toBe(41);
    expect(suspensions).toContainEqual({
      season: 5,
      nickname: "lotain",
      rounds: [5, 7, 9, 13, 14],
    });
    expect(suspensions).toContainEqual({
      season: 7,
      nickname: "Ame's Bastard",
      rounds: [8],
    });
  });

  it("renders unresolved archive identities without false profile links", () => {
    expect(historicalMigration).toContain(
      "Архивная запись сезонной лиги — профиль не привязан",
    );
    expect(profileLink).toContain('if (!/^[1-9]\\d*$/.test(dotaId))');
    expect(profileLink).toContain("Профиль игрока пока не привязан");
  });
});
