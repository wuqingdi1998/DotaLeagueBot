import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../bot/database/migrations/0030_player_identities.sql",
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
});
