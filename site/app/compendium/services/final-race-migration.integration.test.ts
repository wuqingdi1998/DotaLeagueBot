import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import { finalRaceQuests, FINAL_RACE_PRIZES } from "../model/final-star-race-definitions";
const migration = readFileSync(new URL("../../../../bot/database/migrations/0185_october_final_race_paths.sql", import.meta.url), "utf8");
const goldenTempoMigration = readFileSync(new URL("../../../../bot/database/migrations/0186_october_golden_tempo_net_worth.sql", import.meta.url), "utf8");

async function fixture() {
  const db = new PGlite();
  await db.exec(`CREATE TABLE players (discord_id bigint PRIMARY KEY);
    INSERT INTO players VALUES (1), (2);
    CREATE TABLE compendium_star_race_quest_completions (player_id bigint, moscow_date date, reward_amount int, UNIQUE(player_id, moscow_date));
    INSERT INTO compendium_star_race_quest_completions VALUES (1, '2026-10-18', 4);
    CREATE TABLE compendium_star_race_quest_progress (player_id bigint, moscow_date date, progress_amount int);
    INSERT INTO compendium_star_race_quest_progress VALUES (1, '2026-10-18', 1), (1, '2026-10-19', 1);
    CREATE TABLE compendium_star_race_quest_progress_wins (player_id bigint, moscow_date date);
    CREATE TABLE october_compendium_challenge_days (moscow_date date PRIMARY KEY, race_definition jsonb);
    INSERT INTO october_compendium_challenge_days VALUES ('2026-10-18', '{"title":"archived second week"}'), ('2026-10-19', '{"title":"old final quest"}');
    CREATE TABLE october_compendium_verification_requests (challenge_kind text, moscow_date date, status text, next_attempt_at timestamptz, finished_at timestamptz, last_error text, player_id bigint, snapshot jsonb);
    INSERT INTO october_compendium_verification_requests (challenge_kind, moscow_date, status, next_attempt_at) VALUES ('star_race', '2026-10-19', 'pending', NOW());`);
  return db;
}

it("persists all three weeks, replaces final definitions, preserves earlier results and archives stale progress", async () => {
  const db = await fixture();
  try {
    await db.exec(migration);
    await db.exec(goldenTempoMigration);
    const weeks = await db.query<{ definition: { prizes: unknown; questPaths: { core: unknown; support: unknown } } }>(
      "SELECT definition FROM october_compendium_race_week_definitions ORDER BY week_id");
    expect(weeks.rows).toHaveLength(3);
    expect(weeks.rows[2].definition.prizes).toEqual(FINAL_RACE_PRIZES);
    expect(weeks.rows[2].definition.questPaths).toEqual({ core: finalRaceQuests("core"), support: finalRaceQuests("support") });
    expect((await db.query("SELECT player_id, moscow_date::text, reward_amount FROM compendium_star_race_quest_completions")).rows).toEqual([
      { player_id: 1, moscow_date: "2026-10-18", reward_amount: 4 },
    ]);
    expect((await db.query("SELECT race_definition FROM october_compendium_challenge_days WHERE moscow_date='2026-10-18'")).rows)
      .toEqual([{ race_definition: { title: "archived second week" } }]);
    expect((await db.query("SELECT * FROM compendium_star_race_quest_progress WHERE moscow_date='2026-10-19'")).rows).toEqual([]);
    expect((await db.query("SELECT kind FROM october_compendium_final_race_legacy ORDER BY kind")).rows)
      .toEqual([{ kind: "definition" }, { kind: "progress" }]);
    expect((await db.query("SELECT status FROM october_compendium_verification_requests")).rows).toEqual([{ status: "cancelled" }]);
    await expect(db.exec("INSERT INTO compendium_star_race_quest_completions VALUES (1, '2026-10-21', 4)"))
      .rejects.toThrow(/Choose a final race path/);
    await db.exec("INSERT INTO october_compendium_final_race_paths (player_id, path, selected_on) VALUES (1, 'support', '2026-10-21')");
    await expect(db.exec("UPDATE october_compendium_final_race_paths SET path='core' WHERE player_id=1"))
      .rejects.toThrow(/cannot be changed/);
    await expect(db.exec("DELETE FROM october_compendium_final_race_paths WHERE player_id=1"))
      .rejects.toThrow(/cannot be changed/);
    await expect(db.exec("INSERT INTO compendium_star_race_quest_completions VALUES (1, '2026-10-20', 4)"))
      .rejects.toThrow(/earlier dates/);
    await expect(db.exec("INSERT INTO compendium_star_race_quest_completions VALUES (1, '2026-10-21', 3)"))
      .rejects.toThrow(/Unexpected final race reward/);
    await db.exec("INSERT INTO compendium_star_race_quest_completions VALUES (1, '2026-10-21', 4), (1, '2026-10-25', 5)");
    await expect(db.exec("INSERT INTO compendium_star_race_quest_completions VALUES (1, '2026-10-21', 4)"))
      .rejects.toThrow(/duplicate key/);
  } finally { await db.close(); }
}, 30_000);

it("updates only Core's Saturday condition and pending checks, preserving Support and earlier awards", async () => {
  const db = await fixture();
  try {
    await db.exec(migration);
    await db.exec(`INSERT INTO october_compendium_final_race_paths (player_id, path, selected_on) VALUES (1, 'core', '2026-10-19'), (2, 'support', '2026-10-19');
      INSERT INTO compendium_star_race_quest_completions VALUES (1, '2026-10-19', 4), (2, '2026-10-24', 4);
      INSERT INTO october_compendium_verification_requests (player_id, challenge_kind, moscow_date, status, snapshot) VALUES
        (1, 'star_race', '2026-10-24', 'pending', '{"requirement":{"kind":"match-stat-win","conditions":[{"stat":"gold_per_min","minimum":700}]}}'),
        (2, 'star_race', '2026-10-24', 'pending', '{"requirement":{"kind":"match-stat-win","conditions":[{"stat":"hero_healing","minimum":10000}]}}');`);
    await db.exec(goldenTempoMigration);
    const history = (await db.query<{ race_definition: { paths: { core: unknown; support: unknown } } }>("SELECT race_definition FROM october_compendium_challenge_days WHERE moscow_date='2026-10-24'")).rows[0];
    expect(history.race_definition.paths).toEqual({ core: finalRaceQuests("core")[5], support: finalRaceQuests("support")[5] });
    expect((await db.query("SELECT snapshot->'requirement' AS requirement FROM october_compendium_verification_requests WHERE player_id=1")).rows)
      .toEqual([{ requirement: { kind: "cumulative-net-worth", target: 60_000 } }]);
    expect((await db.query("SELECT snapshot->'requirement' AS requirement FROM october_compendium_verification_requests WHERE player_id=2")).rows)
      .toEqual([{ requirement: finalRaceQuests("support")[5].requirement }]);
    expect((await db.query("SELECT COUNT(*)::int AS count, SUM(reward_amount)::int AS stars FROM compendium_star_race_quest_completions")).rows).toEqual([{ count: 3, stars: 12 }]);
  } finally { await db.close(); }
}, 30_000);

it.each(["awards", "progress"])("refuses to replace a Core Saturday condition with existing %s", async (kind) => {
  const db = await fixture();
  try {
    await db.exec(migration);
    await db.exec("INSERT INTO october_compendium_final_race_paths (player_id, path, selected_on) VALUES (1, 'core', '2026-10-19')");
    await db.exec(kind === "awards" ? "INSERT INTO compendium_star_race_quest_completions VALUES (1, '2026-10-24', 4)"
      : "INSERT INTO compendium_star_race_quest_progress VALUES (1, '2026-10-24', 1)");
    await expect(db.transaction(async (tx) => tx.exec(goldenTempoMigration))).rejects.toThrow(/already has core results/);
    expect((await db.query("SELECT definition #>> '{questPaths,core,5,requirement,kind}' AS kind FROM october_compendium_race_week_definitions WHERE week_id='2026-10-19'")).rows).toEqual([{ kind: "match-stat-win" }]);
  } finally { await db.close(); }
}, 30_000);

it("refuses a silent transition if an old final-week award needs reconciliation", async () => {
  const db = await fixture();
  try {
    await db.exec("INSERT INTO compendium_star_race_quest_completions VALUES (1, '2026-10-19', 3)");
    await expect(db.transaction(async (tx) => { await tx.exec(migration); })).rejects.toThrow(/awards already exist/);
    expect((await db.query("SELECT COUNT(*)::int AS count FROM compendium_star_race_quest_completions")).rows).toEqual([{ count: 2 }]);
  } finally { await db.close(); }
}, 30_000);
