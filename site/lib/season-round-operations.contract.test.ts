import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const checkInMigration = source(
  "../../bot/database/migrations/0086_season_round_checkins.sql",
);
const checkInRoute = source("../app/api/season/check-in/route.ts");
const publicRegistrationRoute = source(
  "../app/api/season/registration/route.ts",
);
const registrationRules = source("./season-round-registration.ts");
const seasonRoute = source("../app/api/season/route.ts");
const adminRoute = source("../app/api/admin/season/route.ts");
const registrationActions = source(
  "../app/api/admin/season/season-registration-actions.ts",
);
const registrationAdmin = source(
  "../app/tournaments/[slug]/admin/SeasonRegistrationAdmin.tsx",
);
const lobbyTools = source(
  "../app/tournaments/[slug]/admin/SeasonPublishedLobbyTools.tsx",
);
const lobbyActions = source(
  "../app/api/admin/season/season-published-lobby-actions.ts",
);
const roundPanel = source(
  "../app/tournaments/[slug]/sections/SeasonRoundsPanel.tsx",
);

describe("season round operations", () => {
  it("stores one player check-in for an existing round registration", () => {
    expect(checkInMigration).toContain("CREATE TABLE IF NOT EXISTS season_round_checkins");
    expect(checkInMigration).toContain("REFERENCES season_round_registrations");
    expect(checkInRoute).toContain("seasonRoundCheckInIsOpen");
    expect(checkInRoute).toContain("ON CONFLICT (round_id, player_id) DO NOTHING");
    expect(seasonRoute).toContain("is_checked_in");
  });

  it("opens check-in two hours before start and closes registration ten minutes before", () => {
    expect(registrationRules).toContain("2 * 60 * 60 * 1_000");
    expect(registrationRules).toContain("10 * 60 * 1_000");
    expect(registrationRules).toContain("seasonRoundCheckInWindow");
  });

  it("automatically checks in late public and organizer registrations", () => {
    expect(publicRegistrationRoute).toContain(
      "seasonRoundRegistrationGetsAutomaticCheckIn",
    );
    expect(publicRegistrationRoute).toContain(
      "INSERT INTO season_round_checkins",
    );
    expect(registrationActions).toContain(
      "seasonRoundRegistrationGetsAutomaticCheckIn",
    );
    expect(registrationActions).toContain("INSERT INTO season_round_checkins");
  });

  it("requires a fresh organizer password only for manual registration removal", () => {
    expect(adminRoute).toContain("confirmOrganizerPassword");
    expect(adminRoute.indexOf("confirmOrganizerPassword")).toBeLessThan(
      adminRoute.indexOf("deleteSeasonRoundRegistration(body"),
    );
    expect(registrationAdmin).toContain('type="password"');
    expect(registrationActions).toContain("manual_add");
    expect(registrationActions).not.toContain("new Date");
    expect(registrationActions).not.toContain("NOW() <");
  });

  it("keeps match IDs and substitutions in compact published-lobby tools", () => {
    expect(lobbyTools).toContain("Действия организатора");
    expect(lobbyTools).toContain("dotaMatchIds.map");
    expect(lobbyTools).toContain("SeasonSubstitutionAdmin");
    expect(lobbyActions).toContain("value.length !== 2");
    expect(lobbyActions).toContain("ON CONFLICT (match_id, game_number)");
    expect(roundPanel).toContain("SeasonPublishedLobbyTools");
  });
});
