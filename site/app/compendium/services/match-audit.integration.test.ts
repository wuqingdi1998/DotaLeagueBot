import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

const sourceTables = [
  "compendium_user_quest_completions", "compendium_rune_challenge_completions",
  "october_compendium_rune_challenge_completions", "october_compendium_clan_outing_completions",
  "compendium_star_race_quest_wins", "compendium_star_race_quest_progress_wins",
];

it("queues every credited match atomically, snapshots clan members, and deduplicates across challenges", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE players (discord_id bigint PRIMARY KEY, ingame_name text, steam_id32 text);
      INSERT INTO players VALUES (100, 'Игрок', '101'), (200, 'Соклановец', '202'), (300, 'Другой клан', '303');
      CREATE TABLE october_compendium_clan_members (player_id bigint, clan_id text);
      INSERT INTO october_compendium_clan_members VALUES (100, 'morbus'), (200, 'morbus'), (300, 'panacea');
      CREATE FUNCTION notify_bot_scheduled_events() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RETURN NEW; END;
      $$;
      ${sourceTables.map((table) => `CREATE TABLE ${table} (player_id bigint, matched_match_id bigint);`).join("\n")}
      INSERT INTO compendium_user_quest_completions VALUES (100, 999);
    `);
    await db.exec(readFileSync(new URL(
      "../../../../bot/database/migrations/0171_compendium_match_region_audit.sql", import.meta.url,
    ), "utf8"));
    expect((await db.query("SELECT * FROM match_region_audits")).rows).toHaveLength(0);
    for (const [index, table] of sourceTables.entries()) {
      await db.query(`INSERT INTO ${table} VALUES ($1, $2)`, [100, 1000 + index]);
    }
    await db.exec("INSERT INTO compendium_user_quest_completions VALUES (100, 1001), (100, NULL)");
    await db.exec("INSERT INTO october_compendium_clan_outing_completions VALUES (200, 1000)");
    const saved = await db.query<{ player_id: number; match_id: number; clan_mates: unknown }>(
      "SELECT player_id, match_id, clan_mates FROM match_region_audits ORDER BY id",
    );
    expect(saved.rows).toHaveLength(7);
    expect(saved.rows[0]).toMatchObject({
      player_id: 100, match_id: 1000,
      clan_mates: [{ player_id: "200", dota_id: "202", name: "Соклановец" }],
    });
    await db.exec("BEGIN; INSERT INTO compendium_star_race_quest_wins VALUES (100, 7000); ROLLBACK;");
    expect((await db.query("SELECT * FROM match_region_audits WHERE match_id = 7000")).rows).toHaveLength(0);
    await db.exec("SELECT queue_compendium_match_region_audit(100, 8000, 'star_race_progress')");
    await db.exec("SELECT queue_compendium_match_region_audit(100, 8000, 'star_race_progress')");
    expect((await db.query("SELECT * FROM match_region_audits WHERE match_id = 8000")).rows).toHaveLength(1);
    await db.exec("UPDATE compendium_user_quest_completions SET matched_match_id = 9000 WHERE matched_match_id = 999");
    expect((await db.query("SELECT * FROM match_region_audits WHERE match_id = 9000")).rows).toHaveLength(1);
  } finally {
    await db.close();
  }
}, 30_000);
