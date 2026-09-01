import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source(
  "../../bot/database/migrations/0076_season_round_registrations.sql",
);
const lobbyBuilderMigration = source(
  "../../bot/database/migrations/0078_season_round_lobby_builder.sql",
);
const registrationRoute = source(
  "../app/api/season/registration/route.ts",
);
const registrationRules = source("./season-round-registration.ts");
const seasonRoute = source("../app/api/season/route.ts");
const seasonTypes = source(
  "../app/tournaments/[slug]/model/season-types.ts",
);
const seasonController = source(
  "../app/tournaments/[slug]/hooks/useSeasonController.ts",
);
const roundPanel = source(
  "../app/tournaments/[slug]/sections/SeasonRoundsPanel.tsx",
);
const registrationSection = source(
  "../app/tournaments/[slug]/sections/SeasonRoundRegistration.tsx",
);
const registrationStyles = source(
  "../app/styles/55-season-round-registration.css",
);
const matchAdmin = source(
  "../app/tournaments/[slug]/admin/SeasonMatchAdmin.tsx",
);
const matchActions = source(
  "../app/api/admin/season/season-match-actions.ts",
);
const matchParticipantValidation = source(
  "../app/api/admin/season/season-match-participant-validation.ts",
);
const tournamentForm = source(
  "../app/tournaments/hub/TournamentForm.tsx",
);
const tournamentCreate = source(
  "../app/api/tournament/tournament-create.ts",
);

describe("season round registration contract", () => {
  it("stores one registration per player and round", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS season_round_registrations",
    );
    expect(migration).toContain("PRIMARY KEY (round_id, player_id)");
    expect(migration).toContain("REFERENCES season_rounds(id) ON DELETE CASCADE");
  });

  it("allows registration until ten minutes before start and cancellation before the 24 hour cutoff", () => {
    expect(registrationRoute).toContain("requireSession");
    expect(registrationRoute).toContain("seasonRoundRegistrationIsOpen");
    expect(registrationRoute).toContain("seasonRoundPriorityRegistrationIsOpen");
    expect(registrationRoute).toContain("hasPriorityRegistrationAccess");
    expect(registrationRoute).toContain("seasonRoundCancellationIsOpen");
    expect(registrationRoute).toContain("tier_status !== \"current\"");
    expect(registrationRules).toContain("@frokeng");
    expect(registrationRoute).toContain("ON CONFLICT (round_id, player_id)");
    expect(registrationRoute).toContain("DELETE FROM season_round_registrations");
    expect(lobbyBuilderMigration).toContain("tier_snapshot");
  });

  it("returns round-specific status and registrations to the tournament page", () => {
    expect(seasonRoute).toContain("registration_count");
    expect(seasonRoute).toContain("is_registered");
    expect(seasonRoute).toContain("roundRegistrations");
    expect(seasonRoute).toContain("registration.created_at");
    expect(seasonRoute).toContain("registration.tier_snapshot");
    expect(seasonTypes).toContain("registrations: SeasonRoundRegistration[]");
    expect(seasonController).toContain("updateRoundRegistration");
    expect(roundPanel).toContain("SeasonRoundRegistration");
    expect(registrationSection).toContain("Зарегистрироваться");
    expect(registrationSection).toContain("Отменить регистрацию");
    expect(matchAdmin).toContain("round.registrations");
    expect(matchActions).toContain("validateSeasonMatchParticipantEligibility");
    expect(matchParticipantValidation).toContain("season_round_registrations");
  });

  it("does not ask for a season-wide registration deadline", () => {
    expect(tournamentForm).toContain(
      'form.tournament_type !== "seasonal" && (',
    );
    expect(tournamentCreate).toContain(
      "setSeasonTournamentRegistrationDeadline",
    );
  });

  it("shows compact player identity, tier and positions in that order", () => {
    const playerColumn = registrationSection.indexOf(
      'className="season-registration-player"',
    );
    const tierColumn = registrationSection.indexOf(
      'registration.tier_snapshot ?? "—"',
      playerColumn,
    );
    const positionsColumn = registrationSection.indexOf(
      'registration.positions ?? "—"',
      tierColumn,
    );

    expect(registrationSection).toContain("registration.avatar_url");
    expect(registrationSection).toContain("<Image");
    expect(registrationSection).not.toContain("<FiUser");
    expect(registrationSection).not.toContain(
      "Тир {registration.tier_snapshot",
    );
    expect(registrationSection).not.toContain(
      "Роли {registration.positions",
    );
    expect(registrationStyles).toContain(
      ".season-registration-player-avatar",
    );
    expect(playerColumn).toBeGreaterThan(-1);
    expect(tierColumn).toBeGreaterThan(playerColumn);
    expect(positionsColumn).toBeGreaterThan(tierColumn);
  });

  it("aligns circular tier badges after the longest nickname", () => {
    expect(registrationSection).toContain(
      'className="season-registration-tier"',
    );
    expect(registrationStyles).toContain(
      "34px max-content 30px max-content minmax(24px, 1fr) max-content",
    );
    expect(registrationStyles).toContain("grid-template-columns: subgrid");
    expect(registrationStyles).toMatch(
      /\.season-registration-tier \{[\s\S]*?border-radius: 50%;[\s\S]*?height: 30px;[\s\S]*?width: 30px;/,
    );
  });
});
