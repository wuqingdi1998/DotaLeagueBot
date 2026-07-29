import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../bot/database/migrations/0030_player_identities.sql",
    import.meta.url,
  ),
  "utf8",
);
const nicknameHistoryMigration = readFileSync(
  new URL(
    "../../bot/database/migrations/0031_player_nickname_history.sql",
    import.meta.url,
  ),
  "utf8",
);
const seasonTimesMigration = readFileSync(
  new URL(
    "../../bot/database/migrations/0032_historical_season_match_times.sql",
    import.meta.url,
  ),
  "utf8",
);
const adminRoute = readFileSync(
  new URL("../app/api/admin/players/route.ts", import.meta.url),
  "utf8",
);
const adminService = readFileSync(
  new URL("./player-identity-admin.ts", import.meta.url),
  "utf8",
);
const publicProfile = readFileSync(
  new URL("../app/players/[dotaId]/page.tsx", import.meta.url),
  "utf8",
);
const hallTable = readFileSync(
  new URL("../app/hall-of-fame/HallOfFameTable.tsx", import.meta.url),
  "utf8",
);
const seasonRound = readFileSync(
  new URL(
    "../app/tournaments/[slug]/sections/SeasonRoundsPanel.tsx",
    import.meta.url,
  ),
  "utf8",
);
const tournamentHistory = readFileSync(
  new URL("./player-tournament-history.ts", import.meta.url),
  "utf8",
);
const organizerProfile = readFileSync(
  new URL("./player-profile-organizer.ts", import.meta.url),
  "utf8",
);

describe("player identities and archive safety", () => {
  it("archives players without deleting their historical database row", () => {
    expect(migration).toContain("is_archived BOOLEAN NOT NULL DEFAULT FALSE");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS player_identities");
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS player_identity_members",
    );
    expect(adminService).toContain("SET is_archived = TRUE");
    expect(adminService).not.toMatch(/DELETE FROM players/);
  });

  it("requires a fresh organizer password for archiving", () => {
    expect(adminRoute).toContain(
      'body.action === "archive"',
    );
    expect(adminRoute).toContain("confirmOrganizerPassword");
    expect(adminService).toContain(
      "Нельзя перенести в архив собственный профиль организатора",
    );
  });

  it("supports aliases, merging and linking archive identities", () => {
    expect(adminRoute).toContain('case "rename-archive"');
    expect(adminRoute).toContain('case "merge-archive"');
    expect(adminRoute).toContain('case "link-archive"');
    expect(adminService).toContain("UPDATE player_identity_members");
  });

  it("removes Discord from the public profile", () => {
    expect(publicProfile).not.toContain("profile.links.discord");
    expect(publicProfile).not.toContain("Написать в Discord");
  });

  it("keeps unresolved archive medalists unclickable", () => {
    expect(hallTable).toContain("player.isArchive || !player.dotaId");
    expect(hallTable).toContain("hall-archive-row");
  });

  it("shows only the upper completed status for a season lobby", () => {
    expect(seasonRound).toContain("seasonLobbyStatusLabel(lobby.status)");
    expect(seasonRound).not.toContain("seasonMatchStatusLabel(match.status)");
  });

  it("preserves previous nicknames when a registered player renames", () => {
    expect(nicknameHistoryMigration).toContain(
      "CREATE TABLE IF NOT EXISTS player_nickname_history",
    );
    expect(nicknameHistoryMigration).toContain("OLD.ingame_name");
    expect(nicknameHistoryMigration).toContain("NEW.ingame_name");
    expect(nicknameHistoryMigration).toContain(
      "tournament_roster_snapshots",
    );
    expect(nicknameHistoryMigration).toContain(
      "ALTER TABLE tournament_team_members",
    );
    expect(nicknameHistoryMigration).toContain("season_participants");
  });

  it("sets historical seasonal matches to 22:00 but keeps season 8", () => {
    expect(seasonTimesMigration).toContain("league-season-8");
    expect(seasonTimesMigration).toContain("TIME '22:00'");
    expect(seasonTimesMigration).toContain("season_matches");
    expect(seasonTimesMigration).toContain("season_lobbies");
    expect(seasonTimesMigration).toContain("season_rounds");
  });

  it("shows seasonal placement instead of a fake Finals team", () => {
    expect(tournamentHistory).not.toContain("'Финалы'");
    expect(tournamentHistory).toContain("Место в сезонной таблице");
    expect(tournamentHistory).toContain("usedNickname");
  });

  it("loads linked archive profiles only for the organizer view", () => {
    expect(organizerProfile).toContain("player_nickname_history");
    expect(publicProfile).toContain("user?.isAdmin");
    expect(publicProfile).toContain("loadLinkedArchiveProfiles");
  });
});
