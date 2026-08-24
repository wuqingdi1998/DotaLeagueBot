import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd(), "..");
const read = (relativePath: string) => fs.readFileSync(
  path.join(root, relativePath),
  "utf8",
);

describe("finished TI 2026 compendium freeze", () => {
  it("stops the bot scheduler and manual star adjustments", () => {
    const scheduler = read("bot/cogs/compendium_scheduler.py");
    const starService = read("bot/services/compendium_star_service.py");

    expect(scheduler).toContain("is_ti_2026_compendium_finished");
    expect(starService).toContain("is_ti_2026_compendium_finished");
  });

  it("blocks every compendium table from being changed", () => {
    const migration = read(
      "bot/database/migrations/0085_freeze_ti_2026_compendium.sql",
    );

    expect(migration).toContain("prevent_finished_ti_2026_compendium_mutation");
    expect(migration).toContain("BEFORE INSERT OR UPDATE OR DELETE");
    expect(migration).toContain("compendium_admin_star_adjustments");
    expect(migration).toContain("compendium_user_quest_completions");
    expect(migration).toContain("compendium_prediction_rewards");
    expect(migration).toContain("compendium_star_race_quest_completions");

    const migrationsDirectory = path.join(root, "bot/database/migrations");
    const source = fs.readdirSync(migrationsDirectory)
      .filter((name) => name.endsWith(".sql") && !name.startsWith("0085_"))
      .map((name) => fs.readFileSync(path.join(migrationsDirectory, name), "utf8"))
      .join("\n");
    const compendiumTables = new Set(
      [...source.matchAll(
        /CREATE TABLE(?: IF NOT EXISTS)? (compendium_[a-z_]+)/g,
      )].map((match) => match[1]),
    );
    for (const table of compendiumTables) {
      expect(migration, `${table} must be frozen`).toContain(`'${table}'`);
    }
  });

  it("keeps result reads from trying to update frozen tables", () => {
    const repository = read(
      "site/app/compendium/services/star-race-repository.ts",
    );
    const archive = read(
      "site/app/compendium/admin/star-race-archive-repository.ts",
    );

    expect(repository).toContain("isCompendiumFinished");
    expect(archive).toContain("isCompendiumFinished");
  });
});
