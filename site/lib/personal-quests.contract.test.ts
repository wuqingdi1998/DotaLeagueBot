import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source(
  "../../bot/database/migrations/0050_personal_compendium_quests.sql",
);
const generation = source(
  "../app/compendium/services/personal-quest-generation.ts",
);
const repository = source("../app/compendium/services/repository.ts");
const rerollRepository = source(
  "../app/compendium/services/reroll-repository.ts",
);
const baseRepository = source("../app/compendium/admin/repository.ts");

describe("personal daily quest contract", () => {
  it("stores separate quest positions for every player", () => {
    expect(migration).toContain("ADD COLUMN player_id BIGINT");
    expect(migration).toContain(
      "DROP CONSTRAINT IF EXISTS compendium_daily_quests_quest_set_id_position_key",
    );
    expect(migration).toContain("compendium_daily_quests_player_position_idx");
    expect(generation).toContain("WHERE is_archived = FALSE");
    expect(generation).toContain("(quest_set_id, player_id, position)");
  });

  it("keeps completed shared cards and replaces only unfinished cards", () => {
    expect(generation).toContain("quest.player_id IS NULL");
    expect(generation).toContain("UPDATE compendium_user_quest_completions");
    expect(generation).toContain("SET daily_quest_id = $1");
    expect(generation).toContain("generateRerollQuestHeroes");
  });

  it("excludes the player's rune challenge hero from new cards", () => {
    expect(generation).toContain("compendium_rune_challenge_selections");
    expect(generation).toContain("selected_at AT TIME ZONE 'Europe/Moscow'");
  });

  it("never exposes or mutates another player's personal quest", () => {
    expect(repository).toContain("quest.player_id = $2");
    expect(repository).toContain("quest.player_id = $3");
    expect(rerollRepository).toContain("quest.player_id = $3");
    expect(baseRepository).toContain("quest.player_id = player.discord_id");
  });
});
