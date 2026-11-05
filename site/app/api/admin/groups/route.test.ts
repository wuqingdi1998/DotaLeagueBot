import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.admin, responseFromAuthError: (error: unknown) => {
  if (error instanceof Response) return error;
  throw error;
} }));
vi.mock("@/lib/db", () => ({ transaction: mocks.transaction }));
import { PATCH, POST } from "./route";

let db: PGlite;
const request = (body: object, method = "PATCH") => new Request("https://example.test", {
  method, headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});
const settings = (changes = {}) => ({ groupId: 1, teamCapacity: 4, advanceToUpper: 2, advanceToLower: 2, ...changes });

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE tournaments(id int PRIMARY KEY, start_at timestamptz, end_at timestamptz,
      group_format text, playoff_format text, final_format text, playoff_type text, playoff_starts_on date);
    CREATE TABLE tournament_groups(id serial PRIMARY KEY, tournament_id int REFERENCES tournaments(id),
      name text NOT NULL, team_capacity int, sort_order int, explanation text,
      advance_to_playoff int, advance_to_upper int, advance_to_lower int, UNIQUE(tournament_id,name));
    CREATE TABLE tournament_group_teams(group_id int, application_id int, sort_order int);
    CREATE TABLE tournament_matches(id serial PRIMARY KEY, tournament_id int, group_id int,
      scheduled_at timestamptz, stage text, best_of int, sort_order int, bracket_round int,
      bracket_slot int, bracket_side text, team_a_placeholder text, team_b_placeholder text,
      team_a_application_id int, team_b_application_id int, team_a_score int, team_b_score int,
      team_a_result_label text, team_b_result_label text, decision_note text, status text DEFAULT 'scheduled',
      result_type text DEFAULT 'normal', eliminated_team_application_id int,
      winner_to_match_id int REFERENCES tournament_matches(id) ON DELETE SET NULL, winner_to_slot text,
      loser_to_match_id int REFERENCES tournament_matches(id) ON DELETE SET NULL, loser_to_slot text);
    CREATE TABLE tournament_audit_log(tournament_id int, actor_discord_id bigint, action text,
      entity_type text, entity_id text, details jsonb);
    CREATE TABLE tournament_schedule_days(id int, tournament_id int, day_date date, sort_order int);
    CREATE TABLE tournament_schedule_entries(day_id int, start_time time, stage_name text, series_format text, sort_order int);
    INSERT INTO tournaments VALUES(1,'2026-11-02','2026-12-13','BO2','Double Elimination · BO3','BO5','double_elimination','2026-11-30');
  `);
  await db.exec(readFileSync(new URL("../../../../../bot/database/migrations/0195_optional_group_names.sql", import.meta.url), "utf8"));
});
beforeEach(async () => {
  vi.resetAllMocks(); mocks.admin.mockResolvedValue({ actorDiscordId: null });
  mocks.transaction.mockImplementation(async callback => {
    await db.exec("BEGIN");
    try {
      const result = await callback({ query: async (sql: string, values: unknown[] = []) => {
        if (sql.includes("pg_advisory_xact_lock")) return { rows: [] };
        return db.query(sql, values);
      } });
      await db.exec("COMMIT"); return result;
    } catch (error) { await db.exec("ROLLBACK"); throw error; }
  });
  await db.exec(`TRUNCATE tournament_matches, tournament_groups, tournament_group_teams, tournament_audit_log RESTART IDENTITY;
    INSERT INTO tournament_groups(tournament_id,name,team_capacity,sort_order,advance_to_playoff,advance_to_upper,advance_to_lower)
      VALUES(1,'Группа А',4,0,4,2,2);
    INSERT INTO tournament_matches(tournament_id,group_id,scheduled_at,stage,best_of,sort_order,bracket_round,bracket_slot,bracket_side,team_a_application_id,team_b_application_id)
      VALUES(1,1,'2026-11-05','Групповой этап · Группа А · Раунд 1',2,1,1,1,'group',10,20);
    INSERT INTO tournament_matches(tournament_id,scheduled_at,stage,best_of,sort_order,bracket_round,bracket_slot,bracket_side,team_a_placeholder,team_b_placeholder)
      VALUES(1,'2026-12-13','Гранд-финал',5,10000,1,1,'grand_final','1-е место · Группа А','2-е место · Группа А');`);
});
afterAll(async () => { await db.close(); });

it.each([401, 403])("requires organizer access (%s)", async status => {
  mocks.admin.mockRejectedValue(new Response("Нет доступа", { status }));
  expect((await PATCH(request(settings()))).status).toBe(status);
  expect((await POST(request({ action: "rebuild_playoffs", tournamentId: 1 }, "POST"))).status).toBe(status);
  expect(mocks.transaction).not.toHaveBeenCalled();
});

it("repairs 2 upper + 2 lower, retains the grand final and leaves group matches unchanged", async () => {
  const before = (await db.query("SELECT * FROM tournament_matches WHERE bracket_side='group'")).rows;
  const finalBefore = (await db.query("SELECT id,scheduled_at,best_of FROM tournament_matches WHERE bracket_side='grand_final'")).rows;
  const response = await POST(request({ action: "rebuild_playoffs", tournamentId: 1 }, "POST"));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ postseasonMatchCount: 4 });
  const matches = (await db.query<{ id: number; bracket_side: string; winner_to_match_id: number; loser_to_match_id: number }>("SELECT * FROM tournament_matches WHERE bracket_side<>'group'")).rows;
  expect(matches).toHaveLength(4);
  const upper = matches.find(m => m.bracket_side === "upper")!;
  expect(upper.winner_to_match_id).toBe(2);
  expect(matches.some(m => m.id === upper.loser_to_match_id && m.bracket_side === "lower")).toBe(true);
  expect((await db.query("SELECT id,scheduled_at,best_of FROM tournament_matches WHERE bracket_side='grand_final'")).rows).toEqual(finalBefore);
  expect((await db.query("SELECT * FROM tournament_matches WHERE bracket_side='group'")).rows).toEqual(before);
  expect((await db.query(`SELECT DISTINCT to_char(scheduled_at AT TIME ZONE 'Europe/Moscow','YYYY-MM-DD HH24:MI') AS at
    FROM tournament_matches WHERE bracket_side IN ('upper','lower')`)).rows).toEqual([{ at: "2026-11-30 00:00" }]);
});

it("keeps the explicitly scheduled playoff time instead of the fallback date", async () => {
  await db.exec(`INSERT INTO tournament_schedule_days VALUES(1,1,'2026-12-01',0);
    INSERT INTO tournament_schedule_entries VALUES(1,'19:00','Верхняя сетка','BO3',0)`);
  try {
    expect((await POST(request({ action: "rebuild_playoffs", tournamentId: 1 }, "POST"))).status).toBe(200);
    expect((await db.query(`SELECT to_char(scheduled_at AT TIME ZONE 'Europe/Moscow','YYYY-MM-DD HH24:MI') AS at
      FROM tournament_matches WHERE bracket_side='upper'`)).rows).toEqual([{ at: "2026-12-01 19:00" }]);
  } finally { await db.exec("TRUNCATE tournament_schedule_entries,tournament_schedule_days"); }
});

it("updates qualification and regenerates pending slots atomically", async () => {
  expect((await PATCH(request(settings({ advanceToUpper: 3, advanceToLower: 1 })))).status).toBe(200);
  expect((await db.query("SELECT * FROM tournament_matches WHERE bracket_side<>'group'")).rows).toHaveLength(5);
  expect((await db.query("SELECT name,advance_to_playoff,advance_to_upper,advance_to_lower FROM tournament_groups")).rows[0])
    .toEqual({ name: "Группа А", advance_to_playoff: 4, advance_to_upper: 3, advance_to_lower: 1 });
});

it.each(["team_a_application_id=10", "team_b_score=0", "status='live'", "decision_note='Решение'", "result_type='technical'", "eliminated_team_application_id=10"])(
  "protects assigned or started playoffs (%s) and rolls back qualification", async change => {
    await db.exec(`UPDATE tournament_matches SET ${change} WHERE bracket_side='grand_final'`);
    const before = (await db.query("SELECT * FROM tournament_matches ORDER BY id")).rows;
    expect((await PATCH(request(settings({ advanceToUpper: 3, advanceToLower: 1, name: "Новое имя" })))).status).toBe(409);
    expect((await POST(request({ action: "rebuild_playoffs", tournamentId: 1 }, "POST"))).status).toBe(409);
    expect((await db.query("SELECT * FROM tournament_matches ORDER BY id")).rows).toEqual(before);
    expect((await db.query("SELECT name,advance_to_upper FROM tournament_groups")).rows[0]).toEqual({ name: "Группа А", advance_to_upper: 2 });
  },
);

it("allows renaming after playoffs start while preserving their matches", async () => {
  await db.exec("UPDATE tournament_matches SET status='live' WHERE bracket_side='grand_final'");
  const before = (await db.query("SELECT * FROM tournament_matches WHERE bracket_side='grand_final'")).rows;
  expect((await PATCH(request(settings({ name: "Групповой этап" })))).status).toBe(200);
  expect((await db.query("SELECT stage FROM tournament_matches WHERE bracket_side='group'")).rows[0]).toEqual({ stage: "Групповой этап · Раунд 1" });
  expect((await db.query("SELECT * FROM tournament_matches WHERE bracket_side='grand_final'")).rows).toEqual(before);
});

it("supports blank names for several groups and prevents duplicate nonempty names", async () => {
  expect((await PATCH(request(settings({ name: "  " })))).status).toBe(200);
  expect((await db.query("SELECT team_a_placeholder FROM tournament_matches WHERE bracket_side='upper'")).rows[0])
    .toEqual({ team_a_placeholder: "1-е место группового этапа" });
  await db.exec("INSERT INTO tournament_groups(tournament_id,name,team_capacity,sort_order,advance_to_playoff,advance_to_upper,advance_to_lower) VALUES(1,'',4,1,4,2,2)");
  expect((await PATCH(request(settings({ name: "Этап" })))).status).toBe(200);
  expect((await PATCH(request(settings({ groupId: 2, name: "Этап" })))).status).toBe(409);
  expect((await PATCH(request(settings({ name: "x".repeat(81) })))).status).toBe(400);
});

it("rejects a double-elimination plan with no upper qualifiers", async () => {
  expect((await PATCH(request(settings({ advanceToUpper: 0, advanceToLower: 4 })))).status).toBe(400);
  expect((await db.query("SELECT advance_to_upper FROM tournament_groups")).rows[0]).toEqual({ advance_to_upper: 2 });
});
