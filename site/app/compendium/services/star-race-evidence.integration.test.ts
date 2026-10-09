import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ db: null as PGlite | null }));
vi.mock("@/lib/db", () => ({
  transaction: async (callback: (client: Pick<PGlite, "query">) => Promise<unknown>) =>
    state.db!.transaction((client) => callback(client)),
}));
import { repairStarRaceEvidence } from "./star-race-evidence-repository";

it("migrates old evidence and repairs all matches atomically without changing the award", async () => {
  const db = new PGlite();
  state.db = db;
  try {
    await db.exec("CREATE TABLE players (discord_id bigint PRIMARY KEY); INSERT INTO players VALUES (100);");
    const schema = readFileSync(new URL("../../../../bot/database/migrations/0053_compendium_star_race.sql", import.meta.url), "utf8");
    await db.exec(schema.slice(0, schema.indexOf("CREATE OR REPLACE VIEW")));
    await db.exec(`ALTER TABLE compendium_star_race_quest_completions ADD COLUMN completed_manually_by bigint;
      INSERT INTO compendium_star_race_quest_completions (player_id, moscow_date) VALUES (100, '2026-08-11');
      INSERT INTO compendium_star_race_quest_wins VALUES (1, 100, 1, 1, 2001);`);
    await db.exec(readFileSync(new URL("../../../../bot/database/migrations/0173_star_race_complete_match_evidence.sql", import.meta.url), "utf8"));
    const original = (await db.query("SELECT completed_at, reward_amount FROM compendium_star_race_quest_completions")).rows[0];
    const wins = Array.from({ length: 12 }, (_, index) => ({
      matchId: String(2001 + index), heroId: 1, endedAt: new Date("2026-08-11T10:00:00Z"),
    }));
    expect(await repairStarRaceEvidence({ playerId: "100", dateKey: "2026-08-11", wins })).toBe(true);
    expect((await db.query("SELECT * FROM compendium_star_race_quest_wins")).rows).toHaveLength(12);
    expect((await db.query("SELECT completed_at, reward_amount FROM compendium_star_race_quest_completions")).rows[0]).toEqual(original);
    expect(await repairStarRaceEvidence({ playerId: "100", dateKey: "2026-08-11", wins: wins.slice(0, 1) })).toBe(false);
    expect((await db.query("SELECT * FROM compendium_star_race_quest_wins")).rows).toHaveLength(12);
  } finally { state.db = null; await db.close(); }
}, 30000);
