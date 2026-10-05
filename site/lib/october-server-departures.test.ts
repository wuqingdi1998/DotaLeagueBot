import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("removes departed players and all star sources without restoring old stars on rejoin", async () => {
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
      INSERT INTO players (discord_id) VALUES (1), (2);
      INSERT INTO october_compendium_clan_members VALUES (1, 'morbus', 9), (2, 'panacea', 5);
      INSERT INTO october_compendium_clan_reservations VALUES (1, 'morbus');
      INSERT INTO october_compendium_clan_assignment_drafts VALUES (1, 'morbus');
    `);
    const sources = [
      "compendium_user_quest_completions", "compendium_prediction_rewards",
      "compendium_rune_challenge_completions", "compendium_star_race_quest_completions",
      "october_compendium_clan_outing_completions",
    ];
    for (const source of sources) {
      const timestamp = source === "compendium_prediction_rewards" ? "awarded_at" : "completed_at";
      await db.exec(`CREATE TABLE ${source} (player_id bigint, reward_amount int, ${timestamp} timestamptz);
        INSERT INTO ${source} VALUES (1, 1, '2026-10-05 01:00Z'), (2, 1, '2026-10-05 01:00Z')`);
    }
    await db.exec(`CREATE TABLE compendium_admin_star_adjustments
      (player_id bigint, amount int, created_at timestamptz);
      INSERT INTO compendium_admin_star_adjustments VALUES
        (1, 4, '2026-10-05 01:00Z'), (2, 4, '2026-10-05 01:00Z')`);
    await db.exec(`
      CREATE TABLE compendium_daily_quests (id bigint, position int);
      INSERT INTO compendium_daily_quests VALUES (1, 1);
      ALTER TABLE compendium_user_quest_completions ADD COLUMN daily_quest_id bigint DEFAULT 1;
      ALTER TABLE compendium_admin_star_adjustments ADD COLUMN is_star_race_eligible boolean DEFAULT true;
    `);
    for (const file of ["0166_october_clan_eligibility.sql", "0167_october_server_departures.sql"]) {
      await db.exec(readFileSync(new URL(`../../bot/database/migrations/${file}`, import.meta.url), "utf8"));
    }
    await db.exec(`INSERT INTO october_compendium_server_membership
      (player_id, is_present, stars_reset_at) VALUES (1, false, '2026-10-05 02:00Z'), (2, true, NULL)`);
    expect((await db.query("SELECT * FROM october_compendium_clan_members")).rows)
      .toEqual([{ player_id: 2, clan_id: "panacea", total_points: 5 }]);
    for (const table of ["reservations", "assignment_drafts"]) {
      expect((await db.query(`SELECT * FROM october_compendium_clan_${table}`)).rows).toHaveLength(0);
    }
    expect((await db.query("SELECT SUM(amount)::int AS stars FROM compendium_star_events WHERE player_id=1")).rows)
      .toEqual([{ stars: null }]);
    expect((await db.query("SELECT SUM(amount)::int AS stars FROM compendium_star_events WHERE player_id=2")).rows)
      .toEqual([{ stars: 9 }]);
    expect((await db.query("SELECT * FROM compendium_star_race_events WHERE player_id=1")).rows)
      .toHaveLength(0);
    expect((await db.query("SELECT SUM(amount)::int AS stars FROM compendium_star_race_events WHERE player_id=2")).rows)
      .toEqual([{ stars: 7 }]);
    await db.exec("INSERT INTO october_compendium_clan_members VALUES (1, 'morbus', 0)");
    expect((await db.query("SELECT * FROM october_compendium_clan_members")).rows).toHaveLength(1);
    await db.exec("UPDATE october_compendium_server_membership SET is_present=true WHERE player_id=1");
    expect((await db.query("SELECT * FROM compendium_star_events WHERE player_id=1")).rows).toHaveLength(0);
    await db.exec(`INSERT INTO compendium_admin_star_adjustments (player_id, amount, created_at)
      VALUES (1, 2, '2026-10-05 03:00Z')`);
    expect((await db.query("SELECT SUM(amount)::int AS stars FROM compendium_star_events WHERE player_id=1")).rows)
      .toEqual([{ stars: 2 }]);
    expect((await db.query("SELECT * FROM compendium_admin_star_adjustments WHERE player_id=1")).rows)
      .toHaveLength(2);
    const serviceSource = readFileSync(new URL(
      "../../bot/services/october_server_membership.py", import.meta.url,
    ), "utf8");
    const queries = [...serviceSource.matchAll(/text\("""([\s\S]*?)"""\)/g)]
      .map((match) => match[1]);
    const snapshotQuery = queries[0].replaceAll(":present_ids", "$1")
      .replaceAll(":snapshot_started_at", "$2");
    const eventQuery = queries[1].replaceAll(":is_present", "$1")
      .replaceAll(":player_id", "$2");
    await db.query(eventQuery, [false, 1]);
    const departed = (await db.query<{ stars_reset_at: Date }>(
      "SELECT stars_reset_at FROM october_compendium_server_membership WHERE player_id=1",
    )).rows[0];
    // A full list fetched before the departure must not overwrite the newer event.
    await db.query(snapshotQuery, [[1, 2], "2026-10-05 00:00Z"]);
    expect((await db.query("SELECT is_present FROM october_compendium_server_membership WHERE player_id=1")).rows)
      .toEqual([{ is_present: false }]);
    await db.query(eventQuery, [false, 1]);
    expect((await db.query("SELECT stars_reset_at FROM october_compendium_server_membership WHERE player_id=1")).rows)
      .toEqual([{ stars_reset_at: departed.stars_reset_at }]);
    await db.query(eventQuery, [true, 1]);
    expect((await db.query("SELECT * FROM compendium_star_events WHERE player_id=1")).rows).toHaveLength(0);
    await db.query(snapshotQuery, [[2], "2099-01-01T00:00:00Z"]);
    expect((await db.query("SELECT is_present FROM october_compendium_server_membership WHERE player_id=1")).rows)
      .toEqual([{ is_present: false }]);
  } finally {
    await db.close();
  }
}, 20000);
