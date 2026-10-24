import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { syncOctoberLeagueMatchStars } from "./league-round-rewards";
import { loadOctoberCompendiumClosure } from "./october-closure";
import { assertCompendiumActive } from "../model/lifecycle";

const mocks = vi.hoisted(() => ({ one: vi.fn() }));
vi.mock("@/lib/db", () => ({ one: mocks.one }));

const db = new PGlite();
let serverTime = "2026-10-10T00:00:00+03:00";
const client = {
  query: async (sql: string, values: unknown[]) => db.query(
    sql.replace(/CURRENT_TIMESTAMP|NOW\(\)/g, `TIMESTAMPTZ '${serverTime}'`), values,
  ),
};

beforeAll(async () => {
  await db.exec(`
    CREATE TABLE tournaments (id int PRIMARY KEY, slug text);
    CREATE TABLE season_rounds (id int PRIMARY KEY, tournament_id int, round_number smallint, status text DEFAULT 'active', lobby_configuration_status text DEFAULT 'published');
    CREATE TABLE season_lobbies (id int PRIMARY KEY, round_id int);
    CREATE TABLE season_matches (id int PRIMARY KEY, lobby_id int, status text, team_a_score int, team_b_score int);
    CREATE TABLE season_match_room_players (match_id int, player_id bigint, team_side text);
    CREATE TABLE player_discord_roles (player_id bigint, role_name text);
    CREATE TABLE october_compendium_clan_members (player_id bigint PRIMARY KEY, total_points int);
    CREATE TABLE other_october_stars (player_id bigint, amount int);
    CREATE TABLE compendium_admin_star_adjustments (
      id serial PRIMARY KEY, player_id bigint, amount smallint, administered_by bigint,
      administrator_name text, is_star_race_eligible boolean, season_match_id int,
      created_at timestamptz DEFAULT '2026-10-10T00:00:00+03:00'
    );
    CREATE UNIQUE INDEX league_reward_unique ON compendium_admin_star_adjustments (player_id, season_match_id)
      WHERE season_match_id IS NOT NULL;
    CREATE VIEW compendium_player_star_totals AS
      SELECT player_id, GREATEST(0, SUM(amount))::int AS total_stars FROM (
        SELECT player_id, amount FROM other_october_stars
        UNION ALL SELECT player_id, amount FROM compendium_admin_star_adjustments
          WHERE created_at >= '2026-10-05T00:00:00+03' AND created_at < '2026-10-26T00:00:00+03'
      ) rewards GROUP BY player_id;
    CREATE FUNCTION compendium_stars_count_for_player(player_id bigint, earned_at timestamptz)
      RETURNS boolean LANGUAGE sql AS $$ SELECT player_id <> 4 AND earned_at >= TIMESTAMPTZ '2026-10-05T00:00:00+03' AND earned_at < TIMESTAMPTZ '2026-10-26T00:00:00+03' $$;
    INSERT INTO tournaments VALUES (1, 'league-season-9');
    INSERT INTO season_rounds (id, tournament_id, round_number) VALUES (1, 1, 9);
    INSERT INTO season_lobbies VALUES (1, 1);
    INSERT INTO season_matches VALUES (42, 1, 'completed', 2, 0);
    INSERT INTO season_match_room_players VALUES (42, 1, 'a'), (42, 2, 'b'), (42, 3, 'a'),
      (42, 4, 'a'), (42, 5, 'a');
    INSERT INTO october_compendium_clan_members VALUES (1, 17), (2, 8), (4, 0), (5, 5);
    INSERT INTO other_october_stars VALUES (1, 17), (2, 8), (4, 0), (5, 5);
    INSERT INTO player_discord_roles VALUES (5, 'Массовка');
  `);
  const migration = readFileSync(new URL(
    "../../../../bot/database/migrations/0174_compendium_review_repairs.sql", import.meta.url,
  ), "utf8");
  await db.exec(migration.slice(migration.indexOf("CREATE FUNCTION allow_october_admin_star_adjustment()"))
    .replace(/CURRENT_TIMESTAMP/g, `TIMESTAMPTZ '${serverTime}'`));
  const closingMigration = readFileSync(new URL("../../../../bot/database/migrations/0191_october_final_round_after_deadline.sql", import.meta.url), "utf8");
  await db.query("SELECT set_config('test.server_time', $1, false)", [serverTime]);
  await db.exec(closingMigration.replace(/CURRENT_TIMESTAMP/g, "current_setting('test.server_time')::timestamptz"));
  mocks.one.mockImplementation(async (sql: string, values: unknown[]) => (await db.query(sql, values)).rows[0]);
}, 20000);

afterAll(async () => { await db.close(); });

it("saves round-nine rewards with the real smallint column and October protection trigger", async () => {
  await syncOctoberLeagueMatchStars(client as never, 42);
  expect((await db.query(`SELECT player_id::int, amount, is_star_race_eligible
    FROM compendium_admin_star_adjustments ORDER BY player_id`)).rows).toEqual([
    { player_id: 1, amount: 6, is_star_race_eligible: false },
    { player_id: 2, amount: 1, is_star_race_eligible: false },
  ]);
  expect((await db.query("SELECT total_points FROM october_compendium_clan_members ORDER BY player_id")).rows)
    .toEqual([{ total_points: 23 }, { total_points: 9 }, { total_points: 0 }, { total_points: 5 }]);
  await syncOctoberLeagueMatchStars(client as never, 42);
  expect((await db.query("SELECT SUM(total_points)::int AS clan_stars FROM october_compendium_clan_members")).rows)
    .toEqual([{ clan_stars: 37 }]);
  await db.exec("UPDATE season_matches SET team_a_score = 1, team_b_score = 1 WHERE id = 42");
  await syncOctoberLeagueMatchStars(client as never, 42);
  expect((await db.query("SELECT amount FROM compendium_admin_star_adjustments ORDER BY player_id")).rows)
    .toEqual([{ amount: 3 }, { amount: 3 }]);
  expect((await db.query("SELECT total_points FROM october_compendium_clan_members ORDER BY player_id")).rows)
    .toEqual([{ total_points: 20 }, { total_points: 11 }, { total_points: 0 }, { total_points: 5 }]);
});

it("repairs already awarded league stars without awarding them twice", async () => {
  await db.exec("UPDATE october_compendium_clan_members SET total_points = 17 WHERE player_id = 1");
  const repair = readFileSync(new URL(
    "../../../../bot/database/migrations/0177_reconcile_october_league_clan_points.sql", import.meta.url,
  ), "utf8");
  await db.exec(repair);
  await db.exec(repair);
  expect((await db.query("SELECT total_points FROM october_compendium_clan_members WHERE player_id = 1")).rows)
    .toEqual([{ total_points: 20 }]);
  expect((await db.query("SELECT COUNT(*)::int AS rewards FROM compendium_admin_star_adjustments")).rows)
    .toEqual([{ rewards: 2 }]);
});

it("leaves archived awards intact when league results are saved outside October", async () => {
  await db.exec("UPDATE season_rounds SET round_number = 8");
  for (const time of ["2026-10-04T23:59:59+03:00", "2026-10-26T00:00:00+03:00"]) {
    serverTime = time;
    await syncOctoberLeagueMatchStars(client as never, 42);
  }
  expect((await db.query("SELECT amount FROM compendium_admin_star_adjustments ORDER BY player_id")).rows)
    .toEqual([{ amount: 3 }, { amount: 3 }]);
  await db.exec("UPDATE season_rounds SET round_number = 9");
});

it("waits for every final-round result and reward, including after midnight, without duplicate stars", async () => {
  const afterDeadline = new Date("2026-10-26T01:00:00+03:00");
  expect(() => assertCompendiumActive(afterDeadline)).toThrow();
  expect(await loadOctoberCompendiumClosure(new Date("2026-10-25T23:59:59+03:00"))).toBe("active");
  await db.exec("UPDATE season_rounds SET lobby_configuration_status = 'none'");
  expect(await loadOctoberCompendiumClosure(afterDeadline)).toBe("settling");
  await db.exec(`UPDATE season_rounds SET lobby_configuration_status = 'published';
    INSERT INTO season_matches VALUES (43, 1, 'published', 0, 0);
    INSERT INTO season_match_room_players VALUES (43, 1, 'a'), (43, 2, 'b'), (43, 3, 'a'), (43, 4, 'a'), (43, 5, 'a');`);
  expect(await loadOctoberCompendiumClosure(afterDeadline)).toBe("settling");
  await db.exec("UPDATE season_matches SET status='completed', team_a_score=2, team_b_score=0 WHERE id=43");
  expect(await loadOctoberCompendiumClosure(afterDeadline)).toBe("settling");
  serverTime = afterDeadline.toISOString();
  await db.query("SELECT set_config('test.server_time', $1, false)", [serverTime]);
  await syncOctoberLeagueMatchStars(client as never, 43);
  await syncOctoberLeagueMatchStars(client as never, 43);
  expect(await loadOctoberCompendiumClosure(afterDeadline)).toBe("finished");
  expect((await db.query("SELECT amount FROM compendium_admin_star_adjustments WHERE season_match_id=43 ORDER BY player_id")).rows).toEqual([{ amount: 6 }, { amount: 1 }]);
  expect((await db.query("SELECT total_points FROM october_compendium_clan_members WHERE player_id IN(1,2) ORDER BY player_id")).rows).toEqual([{ total_points: 26 }, { total_points: 12 }]);
  expect((await db.query("SELECT COUNT(*)::int AS rewards FROM compendium_admin_star_adjustments WHERE season_match_id=43 AND created_at < TIMESTAMPTZ '2026-10-26T00:00:00+03'")).rows).toEqual([{ rewards: 2 }]);
  await db.exec("UPDATE october_compendium_clan_members SET total_points = 17 WHERE player_id = 1");
  expect(await loadOctoberCompendiumClosure(afterDeadline)).toBe("settling");
  await syncOctoberLeagueMatchStars(client as never, 43);
  expect(await loadOctoberCompendiumClosure(afterDeadline)).toBe("finished");
  await db.exec("UPDATE season_matches SET team_a_score=1,team_b_score=1 WHERE id=43");
  expect(await loadOctoberCompendiumClosure(afterDeadline)).toBe("settling");
  await syncOctoberLeagueMatchStars(client as never, 43);
  expect(await loadOctoberCompendiumClosure(afterDeadline)).toBe("finished");
  await expect(db.exec("INSERT INTO compendium_admin_star_adjustments(player_id,amount,created_at) VALUES(1,100,'2026-10-25T23:59:59+03')")).rejects.toThrow("outside the active October period");
});
