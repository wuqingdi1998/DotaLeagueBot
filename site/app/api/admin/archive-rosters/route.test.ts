import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), query: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireAdmin: mocks.admin,
  responseFromAuthError: (error: unknown) => {
    if (error instanceof Response) return error;
    throw error;
  },
}));
vi.mock("@/lib/db", () => ({ query: mocks.query, transaction: mocks.transaction }));
import { PUT } from "./route";

let db: PGlite;
let uploads: string;
const roles = ["safe_lane", "mid_lane", "off_lane", "soft_support", "hard_support", "coach"];
const roster = (overrides = {}) => ({
  tournamentId: 1, teamName: "Команда", tag: "TEAM",
  players: roles.map((role, i) => ({ role, nickname: `Player ${i}`, isCaptain: i === 0 })),
  ...overrides,
});
const image = () => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "logo.png", { type: "image/png" });
function request(body: object, emblem?: File) {
  if (emblem) {
    const form = new FormData();
    form.set("roster", JSON.stringify(body));
    form.set("emblem", emblem);
    return new Request("https://example.test", { method: "PUT", body: form });
  }
  return new Request("https://example.test", {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  db = new PGlite();
  uploads = await mkdtemp(path.join(os.tmpdir(), "roster-test-"));
  vi.stubEnv("UPLOADS_DIR", uploads);
  await db.exec(`
    CREATE TABLE tournaments(id int PRIMARY KEY, team_size int);
    INSERT INTO tournaments VALUES(1,5),(2,5);
    CREATE TABLE players(discord_id bigint PRIMARY KEY, steam_id32 bigint, ingame_name text);
    INSERT INTO players VALUES(100,12345,'Player 0');
    CREATE TABLE tournament_team_applications(
      id serial PRIMARY KEY, tournament_id int REFERENCES tournaments(id),
      team_name text, tag text, captain_discord_id bigint, contact text, logo_key text,
      selection_method text, captain_name_snapshot text, team_tier_total_snapshot int,
      status text, updated_at timestamptz, UNIQUE(tournament_id,tag)
    );
    CREATE TABLE tournament_roster_snapshots(
      application_id int REFERENCES tournament_team_applications(id) ON DELETE CASCADE,
      player_id bigint REFERENCES players(discord_id), nickname_snapshot text,
      role text, tier_snapshot int, is_captain bool, sort_order int
    );
    CREATE TABLE tournament_audit_log(
      tournament_id int, actor_discord_id bigint, action text, entity_type text, entity_id text
    );
  `);
});
beforeEach(async () => {
  vi.resetAllMocks();
  mocks.admin.mockResolvedValue({ actorDiscordId: null });
  const query = async (sql: string, values: unknown[] = []) => {
    const result = await db.query(sql, values);
    return { ...result, rowCount: result.affectedRows || result.rows.length };
  };
  mocks.query.mockImplementation(async (sql, values) => (await query(sql, values)).rows);
  mocks.transaction.mockImplementation(async (callback) => {
    await db.exec("BEGIN");
    try {
      const result = await callback({ query });
      await db.exec("COMMIT");
      return result;
    } catch (error) {
      await db.exec("ROLLBACK");
      throw error;
    }
  });
  await db.exec("TRUNCATE tournament_team_applications, tournament_roster_snapshots, tournament_audit_log RESTART IDENTITY");
});
afterAll(async () => {
  await db.close();
  vi.unstubAllEnvs();
  expect(path.dirname(uploads)).toBe(os.tmpdir());
  expect(path.basename(uploads)).toMatch(/^roster-test-/);
  await rm(uploads, { recursive: true, force: true });
});

it.each([401, 403])("requires organizer access (%s)", async (status) => {
  mocks.admin.mockRejectedValue(new Response("Нет доступа", { status }));
  expect((await PUT(request(roster(), image()))).status).toBe(status);
  expect(mocks.transaction).not.toHaveBeenCalled();
});

it("registers four approved rosters with five players and a coach, without logos", async () => {
  for (let i = 0; i < 4; i++) {
    expect((await PUT(request(roster({ teamName: `Team ${i}`, tag: `T${i}` })))).status).toBe(200);
  }
  const result = await db.query<{ status: string; logo_key: string }>("SELECT status,logo_key FROM tournament_team_applications");
  expect(result.rows).toHaveLength(4);
  expect(result.rows.every((row) => row.status === "approved" && row.logo_key === "")).toBe(true);
  expect((await db.query("SELECT * FROM tournament_roster_snapshots")).rows).toHaveLength(24);
  expect((await db.query("SELECT * FROM tournament_roster_snapshots WHERE role='coach' AND is_captain=false")).rows).toHaveLength(4);
});

it("adds a logo later, preserves it on roster edits and can replace it", async () => {
  const created = await (await PUT(request(roster()))).json();
  const body = roster({ applicationId: created.id });
  expect((await PUT(request(body, image()))).status).toBe(200);
  const logo = async () => (await db.query<{ logo_key: string }>("SELECT logo_key FROM tournament_team_applications")).rows[0].logo_key;
  const first = await logo();
  expect(first).toMatch(/\.png$/);
  expect((await PUT(request(body))).status).toBe(200);
  expect(await logo()).toBe(first);
  expect((await PUT(request(body, image()))).status).toBe(200);
  expect(await logo()).not.toBe(first);
});

it("uploads a logo during creation and links a player using Dota ID", async () => {
  const body = roster();
  Object.assign(body.players[0], { dotaId: "12345" });
  expect((await PUT(request(body, image()))).status).toBe(200);
  expect((await db.query("SELECT player_id::text FROM tournament_roster_snapshots WHERE is_captain")).rows[0]).toEqual({ player_id: "100" });
  expect((await db.query<{ logo_key: string }>("SELECT logo_key FROM tournament_team_applications")).rows[0].logo_key).toMatch(/\.png$/);
});

it("keeps another tournament unchanged and cleans up a file if saving fails", async () => {
  const { id } = await (await PUT(request(roster()))).json();
  const before = await readdir(path.join(uploads, "team-emblems"));
  expect((await PUT(request(roster({ applicationId: id, tournamentId: 2 }), image()))).status).toBe(404);
  expect(await readdir(path.join(uploads, "team-emblems"))).toEqual(before);
  expect((await db.query("SELECT tournament_id,team_name FROM tournament_team_applications")).rows).toEqual([{ tournament_id: 1, team_name: "Команда" }]);
});

it.each([
  ["two coaches", () => ({ players: [...roster().players, roster().players[5]] })],
  ["coach captain", () => ({ players: roster().players.map((p) => ({ ...p, isCaptain: p.isCaptain || p.role === "coach" })) })],
  ["duplicate positions", () => ({ players: roster().players.map((p, i) => ({ ...p, role: i === 1 ? "safe_lane" : p.role })) })],
])("rejects invalid roster: %s", async (_label, changes) => {
  expect((await PUT(request(roster(changes())))).status).toBe(400);
  expect(mocks.transaction).not.toHaveBeenCalled();
});

it.each([
  new File(["invalid"], "logo.png", { type: "image/png" }),
  new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" }),
  new File([new Uint8Array(2 * 1024 * 1024 + 1)], "logo.png", { type: "image/png" }),
])("rejects invalid or oversized logos", async (file) => {
  expect((await PUT(request(roster(), file))).status).toBe(400);
  expect(mocks.transaction).not.toHaveBeenCalled();
});
