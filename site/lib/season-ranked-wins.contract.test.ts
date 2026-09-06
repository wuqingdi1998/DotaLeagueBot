import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source(
  "../../bot/database/migrations/0093_season_ranked_win_checks.sql",
);
const incompleteSnapshotReset = source(
  "../../bot/database/migrations/0095_reset_season_ranked_win_checks.sql",
);
const stratzOnlySnapshotReset = source(
  "../../bot/database/migrations/0096_reset_ranked_wins_for_stratz_only.sql",
);
const registrationRoute = source("../app/api/season/registration/route.ts");
const refreshRoute = source(
  "../app/api/internal/season/ranked-wins/route.ts",
);
const seasonRoute = source("../app/api/season/route.ts");
const registrationSection = source(
  "../app/tournaments/[slug]/sections/SeasonRoundRegistration.tsx",
);
const registrationStyles = source(
  "../app/styles/55-season-round-registration.css",
);
const rankedWinService = source("./season-ranked-wins/service.ts");
const rankedWinModel = source("./season-ranked-wins/model.ts");

describe("season ranked wins contract", () => {
  it("stores one freshly recalculated snapshot per player", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS season_ranked_win_checks",
    );
    expect(migration).toContain("player_id BIGINT PRIMARY KEY");
    expect(migration).toContain("primary_wins SMALLINT NOT NULL");
    expect(migration).toContain("secondary_wins SMALLINT NOT NULL");
    expect(migration).toContain("checked_at TIMESTAMPTZ NOT NULL");
    expect(incompleteSnapshotReset).toContain(
      "DELETE FROM season_ranked_win_checks",
    );
    expect(stratzOnlySnapshotReset).toContain(
      "DELETE FROM season_ranked_win_checks",
    );
  });

  it("refreshes after registration and through the protected scheduler route", () => {
    expect(registrationRoute).toContain("refreshRoundRegistrationRankedWins");
    expect(refreshRoute).toContain("schedulerInternalAuthError");
    expect(refreshRoute).toContain("refreshRegisteredSeasonRankedWins");
  });

  it("returns wins in the list without continuous Stratz calls", () => {
    expect(seasonRoute).toContain("LEFT JOIN season_ranked_win_checks");
    expect(seasonRoute).toContain("freshPlayerRankedWins");
    expect(registrationSection).toContain("Рейтинговые победы за 30 дней");
    expect(registrationSection).toContain(
      "Мои рейтинговые победы за 30 дней",
    );
    expect(registrationSection).toContain("SEASON_PRIMARY_ROLE_WINS_REQUIRED");
    expect(registrationSection).toContain(
      "SEASON_SECONDARY_ROLE_WINS_REQUIRED",
    );
  });

  it("colors primary and secondary win requirements independently", () => {
    expect(registrationSection).toMatch(
      /rankedWinRequirementClass\(\s*registration\.primary_wins,\s*SEASON_PRIMARY_ROLE_WINS_REQUIRED/,
    );
    expect(registrationSection).toMatch(
      /rankedWinRequirementClass\(\s*registration\.secondary_wins,\s*SEASON_SECONDARY_ROLE_WINS_REQUIRED/,
    );
    expect(registrationStyles).toContain(".season-registration-win.met");
    expect(registrationStyles).toContain(".season-registration-win.missing");
    expect(seasonRoute).toContain("ranked_wins.source AS wins_source");
    expect(registrationSection).toContain('source === "manual"');
    expect(registrationStyles).toContain(".season-registration-win.manual");
  });

  it("uses Stratz for the match list and DotaBuff only for missing roles", () => {
    expect(rankedWinService).toContain("fetchStratzRankedMatches");
    expect(rankedWinService).toContain("fetchDotaBuffRolesForMatches");
    expect(rankedWinService).not.toContain("fetchOpenDotaRankedMatches");
    expect(rankedWinService).not.toContain("fetchDotaBuffRankedMatches");
    expect(rankedWinModel).not.toContain("RankedWinSource");
    expect(rankedWinService).toContain("findRankedWinsWithoutRoles");
  });
});
