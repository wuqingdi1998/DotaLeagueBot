import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source(
  "../../bot/database/migrations/0156_tournament_registration_start.sql",
);
const createRoute = source("../app/api/tournament/tournament-create.ts");
const updateRoute = source("../app/api/tournament/tournament-update.ts");
const detailRoute = source("../app/api/tournament/route.ts");
const listRoute = source("../app/api/tournaments/route.ts");
const createForm = source("../app/tournaments/hub/TournamentForm.tsx");
const editor = source(
  "../app/tournaments/[slug]/admin/TournamentDetailsEditor.tsx",
);
const hero = source("../app/tournaments/[slug]/sections/TournamentHero.tsx");

describe("tournament registration start contract", () => {
  it("persists and returns an optional registration start", () => {
    expect(migration).toContain("registration_starts_at TIMESTAMPTZ");
    expect(createRoute).toContain("registration_starts_at");
    expect(updateRoute).toContain("registration_starts_at");
    expect(detailRoute).toContain("registration_starts_at");
    expect(listRoute).toContain("t.registration_starts_at");
  });

  it("lets organizers set or clear the date", () => {
    expect(createForm).toContain('label="Старт регистрации"');
    expect(editor).toContain("Старт регистрации");
    expect(editor).toContain('setField("registration_starts_at", null)');
  });

  it("shows the planned opening time to visitors", () => {
    expect(hero).toContain("Регистрация откроется");
    expect(hero).toContain("registration_starts_at");
  });
});
