import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const tournamentUpdate = source(
  "../app/api/tournament/tournament-update.ts",
);
const tournamentEditor = source(
  "../app/tournaments/[slug]/admin/TournamentDetailsEditor.tsx",
);
const tournamentListRoute = source("../app/api/tournaments/route.ts");
const plannedStatusMigration = source(
  "../../bot/database/migrations/0089_tournament_planned_status.sql",
);

describe("tournament settings contract", () => {
  it("recalculates the hidden seasonal registration deadline on update", () => {
    expect(tournamentUpdate).toContain(
      "setSeasonTournamentRegistrationDeadline",
    );
  });

  it("offers and accepts the planned tournament status", () => {
    expect(tournamentEditor).toContain(
      '<option value="planned">Турнир запланирован</option>',
    );
    expect(tournamentListRoute).toContain("isTournamentStatus");
    expect(plannedStatusMigration).toContain("'planned'");
  });
});
