import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source("../../bot/database/migrations/0065_tournament_registration_tiers.sql");
const applications = source("../app/api/applications/route.ts");
const tournamentRoute = source("../app/api/tournament/route.ts");
const tournamentUpdate = source("../app/api/tournament/tournament-update.ts");
const modal = source("../app/tournaments/[slug]/components/TournamentModals.tsx");
const autocomplete = source("../app/tournaments/[slug]/components/PlayerAutocomplete.tsx");
const teams = source("../app/tournaments/[slug]/sections/TeamsPanel.tsx");
const adminApplications = source("../app/tournaments/[slug]/admin/ApplicationsAdmin.tsx");
const tournamentEditor = source(
  "../app/tournaments/[slug]/admin/TournamentDetailsEditor.tsx",
);

describe("tournament registration tier contract", () => {
  it("stores optional tournament settings and historical member tiers", () => {
    expect(migration).toContain("max_team_tier");
    expect(migration).toContain("show_tiers");
    expect(migration).toContain("tournament_team_members");
    expect(migration).toContain("tier_snapshot");
  });

  it("rechecks the tier limit and stores snapshots during registration", () => {
    expect(applications).toContain("registrationTierError");
    expect(applications).toContain("FOR SHARE");
    expect(applications).toContain("team_tier_total_snapshot");
    expect(applications).toContain("tier_snapshot");
  });

  it("saves an optional limit from tournament management", () => {
    expect(tournamentEditor).toContain("Максимальный тир");
    expect(tournamentEditor).toContain('placeholder="Без ограничения"');
    expect(tournamentUpdate).toContain("parseMaximumTeamTier");
    expect(tournamentUpdate).toContain("max_team_tier = $24");
  });

  it("uses a styled autocomplete instead of the system datalist", () => {
    expect(modal).not.toContain("<datalist");
    expect(modal).not.toContain('list="registered-players"');
    expect(modal).toContain("PlayerAutocomplete");
    expect(autocomplete).toContain("player-autocomplete-menu");
    expect(autocomplete).toContain('role="listbox"');
  });

  it("disables submission when the selected team exceeds the limit", () => {
    expect(modal).toContain("isRegistrationTierExceeded");
    expect(modal).toMatch(
      /disabled=\{[\s\S]*isRegistrationTierExceeded[\s\S]*\}/,
    );
  });

  it("shows saved tiers in admin and obeys the public visibility switch", () => {
    expect(tournamentRoute).toContain("m.tier_snapshot");
    expect(adminApplications).toContain("player.tier");
    expect(teams).toContain("tournament.show_tiers");
  });
});
