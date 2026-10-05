import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("removes excluded members, preserves eligible clans and blocks reassignment", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE players (discord_id bigint PRIMARY KEY,
        tier_status text DEFAULT 'current', is_archived boolean DEFAULT false);
      CREATE TABLE player_discord_roles (player_id bigint, role_name text);
      CREATE TABLE october_compendium_clan_members (
        player_id bigint PRIMARY KEY, clan_id text, total_points int DEFAULT 0);
      CREATE TABLE october_compendium_clan_reservations (player_id bigint, clan_id text);
      CREATE TABLE october_compendium_clan_assignment_drafts (player_id bigint, clan_id text);
      INSERT INTO players (discord_id, tier_status) VALUES
        (1, 'current'), (2, 'inactive'), (3, 'current'), (4, 'outdated');
      INSERT INTO player_discord_roles VALUES (3, 'Массовка');
      INSERT INTO october_compendium_clan_members VALUES
        (1, 'morbus', 7), (2, 'morbus', 5), (3, 'panacea', 3), (4, 'panacea', 2);
      INSERT INTO october_compendium_clan_reservations
        SELECT player_id, clan_id FROM october_compendium_clan_members;
      INSERT INTO october_compendium_clan_assignment_drafts
        SELECT player_id, clan_id FROM october_compendium_clan_members;
    `);
    await db.exec(readFileSync(new URL(
      "../../bot/database/migrations/0166_october_clan_eligibility.sql", import.meta.url,
    ), "utf8"));
    for (const table of ["members", "reservations", "assignment_drafts"]) {
      const result = await db.query<{ player_id: number }>(
        `SELECT player_id FROM october_compendium_clan_${table} ORDER BY player_id`,
      );
      expect(result.rows.map((row) => Number(row.player_id))).toEqual([1, 4]);
      await db.exec(`INSERT INTO october_compendium_clan_${table}
        (player_id, clan_id) VALUES (2, 'morbus'), (3, 'panacea')`);
      expect((await db.query(`SELECT * FROM october_compendium_clan_${table}`)).rows)
        .toHaveLength(2);
    }
    expect((await db.query("SELECT * FROM october_compendium_removed_clan_members")).rows)
      .toHaveLength(2);
    await db.exec("UPDATE players SET tier_status = 'inactive' WHERE discord_id = 1");
    expect((await db.query("SELECT * FROM october_compendium_clan_members")).rows)
      .toEqual([{ player_id: 4, clan_id: "panacea", total_points: 2 }]);
    await db.exec("INSERT INTO player_discord_roles VALUES (4, ' массовка ')");
    expect((await db.query("SELECT * FROM october_compendium_clan_members")).rows)
      .toHaveLength(0);
    await db.exec("DELETE FROM player_discord_roles; UPDATE players SET tier_status = 'current'");
    await db.exec("INSERT INTO october_compendium_clan_members VALUES (3, 'panacea', 0)");
    await db.exec("SELECT remove_ineligible_october_clan_players(ARRAY[3]::bigint[])");
    expect((await db.query("SELECT * FROM october_compendium_clan_members")).rows)
      .toHaveLength(0);
  } finally {
    await db.close();
  }
}, 20000);
