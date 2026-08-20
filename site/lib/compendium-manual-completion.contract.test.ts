import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source(
  "../../bot/database/migrations/0078_compendium_manual_challenge_completions.sql",
);
const route = source(
  "../app/api/admin/compendium-base/participants/[playerId]/complete/route.ts",
);
const repository = source(
  "../app/compendium/admin/manual-completion-repository.ts",
);
const baseRepository = source("../app/compendium/admin/repository.ts");
const baseView = source("../app/compendium/admin/CurrentQuestCards.tsx");
const questCard = source("../app/compendium/components/QuestCard.tsx");
const raceCard = source(
  "../app/compendium/components/CompendiumStarRace.tsx",
);

describe("manual compendium challenge completion", () => {
  it("stores an auditable completion without inventing an OpenDota match", () => {
    expect(migration).toContain("completion_source");
    expect(migration).toContain("completed_manually_by");
    expect(migration).toContain("DROP NOT NULL");
    expect(migration).toContain("completion_source = 'manual'");
    expect(repository).toContain("matched_hero_id, matched_match_id");
    expect(repository).toContain("NULL, NULL");
  });

  it("allows only an organizer and prevents duplicate rewards", () => {
    expect(route).toContain("await requireAdmin()");
    expect(repository).toContain("pg_advisory_xact_lock");
    expect(repository).toContain("ON CONFLICT (player_id, daily_quest_id)");
    expect(repository).toContain("ON CONFLICT (player_id, moscow_date)");
  });

  it("shows every available current card and the active race challenge", () => {
    expect(baseRepository).toContain("BONUS_QUEST_STAR_THRESHOLD");
    expect(baseRepository).toContain("currentStarRaceQuests");
    expect(baseView).toContain("Засчитать вручную");
    expect(baseView).toContain("Испытание гонки");
  });

  it("shows manual completion without a fake match link", () => {
    expect(questCard).toContain("Засчитано организатором");
    expect(raceCard).toContain("Засчитано организатором");
  });
});
