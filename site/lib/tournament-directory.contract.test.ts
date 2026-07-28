import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const tournamentListRoute = source("../app/api/tournaments/route.ts");
const tournamentCard = source(
  "../app/tournaments/hub/TournamentCard.tsx",
);

describe("tournament directory contract", () => {
  it("loads season participant and round totals", () => {
    expect(tournamentListRoute).toContain("t.tournament_type");
    expect(tournamentListRoute).toContain("t.season_round_count::int");
    expect(tournamentListRoute).toContain("AS participant_count");
    expect(tournamentListRoute).toContain(
      "participant.tournament_id = t.id",
    );
  });

  it("uses season statistics only for seasonal tournament cards", () => {
    expect(tournamentCard).toContain(
      'tournament.tournament_type === "seasonal"',
    );
    expect(tournamentCard).toContain(
      'isSeasonal ? "Участники" : "Команды"',
    );
    expect(tournamentCard).toContain(
      'isSeasonal ? "Туры" : "Результаты"',
    );
    expect(tournamentCard).toContain("tournament.participant_count");
    expect(tournamentCard).toContain("tournament.season_round_count");
  });
});
