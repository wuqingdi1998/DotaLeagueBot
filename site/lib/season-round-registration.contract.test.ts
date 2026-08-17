import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source(
  "../../bot/database/migrations/0076_season_round_registrations.sql",
);
const registrationRoute = source(
  "../app/api/season/registration/route.ts",
);
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

  it("allows registration and cancellation only before the 24 hour cutoff", () => {
    expect(registrationRoute).toContain("requireSession");
    expect(registrationRoute).toContain("seasonRoundRegistrationIsOpen");
    expect(registrationRoute).toContain("ON CONFLICT (round_id, player_id)");
    expect(registrationRoute).toContain("DELETE FROM season_round_registrations");
  });

  it("returns round-specific status and registrations to the tournament page", () => {
    expect(seasonRoute).toContain("registration_count");
    expect(seasonRoute).toContain("is_registered");
    expect(seasonRoute).toContain("roundRegistrations");
    expect(seasonTypes).toContain("registrations: SeasonRoundRegistration[]");
    expect(seasonController).toContain("updateRoundRegistration");
    expect(roundPanel).toContain("Зарегистрироваться");
    expect(roundPanel).toContain("Отменить регистрацию");
    expect(matchAdmin).toContain("round.registrations");
    expect(matchActions).toContain("validateSeasonMatchParticipantEligibility");
    expect(matchParticipantValidation).toContain("season_round_registrations");
  });

  it("does not ask for a season-wide registration deadline", () => {
    expect(tournamentForm).toContain(
      'form.tournament_type !== "seasonal" && (',
    );
    expect(tournamentCreate).toContain("seasonRegistrationDeadline");
  });
});
