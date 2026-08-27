import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source(
  "../../bot/database/migrations/0093_season_ranked_win_checks.sql",
);
const registrationRoute = source(
  "../app/api/season/registration/route.ts",
);
const refreshRoute = source(
  "../app/api/internal/season/ranked-wins/route.ts",
);
const seasonRoute = source("../app/api/season/route.ts");
const registrationSection = source(
  "../app/tournaments/[slug]/sections/SeasonRoundRegistration.tsx",
);
const rankedWinService = source("./season-ranked-wins/service.ts");
const rankedWinModel = source("./season-ranked-wins/model.ts");

describe("season ranked wins contract", () => {
  it("stores one freshly recalculated snapshot per player", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS season_ranked_win_checks");
    expect(migration).toContain("player_id BIGINT PRIMARY KEY");
    expect(migration).toContain("primary_wins SMALLINT NOT NULL");
    expect(migration).toContain("secondary_wins SMALLINT NOT NULL");
    expect(migration).toContain("checked_at TIMESTAMPTZ NOT NULL");
  });

  it("refreshes immediately after registration and through the protected scheduler route", () => {
    expect(registrationRoute).toContain("refreshRoundRegistrationRankedWins");
    expect(refreshRoute).toContain("schedulerInternalAuthError");
    expect(refreshRoute).toContain("refreshRegisteredSeasonRankedWins");
  });

  it("returns wins in the registration list without continuous provider calls", () => {
    expect(seasonRoute).toContain("LEFT JOIN season_ranked_win_checks");
    expect(seasonRoute).toContain("freshPlayerRankedWins");
    expect(registrationSection).toContain("Рейтинговые победы за 30 дней");
    expect(registrationSection).toContain("Мои рейтинговые победы за 30 дней");
    expect(registrationSection).toContain("SEASON_PRIMARY_ROLE_WINS_REQUIRED");
    expect(registrationSection).toContain("SEASON_SECONDARY_ROLE_WINS_REQUIRED");
  });

  it("checks all three platforms and gives Stratz roles the highest priority", () => {
    expect(rankedWinService).toContain("fetchOpenDotaRankedMatches");
    expect(rankedWinService).toContain("fetchDotaBuffRankedMatches");
    expect(rankedWinService).toContain("fetchStratzRankedMatches");
    expect(rankedWinModel).toContain('"opendota" | "dotabuff" | "stratz"');
    expect(rankedWinService).toContain(
      "OpenDota, DotaBuff и Stratz сейчас не смогли вернуть матчи",
    );
  });
});
