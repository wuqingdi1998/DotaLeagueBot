import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ db: null as PGlite | null, stratz: vi.fn() }));
vi.mock("@/lib/db", () => ({
  one: async (sql: string, values: unknown[]) => (await state.db!.query(sql, values)).rows[0] ?? null,
  query: async (sql: string, values: unknown[]) => (await state.db!.query(sql, values)).rows,
  transaction: async (callback: (client: unknown) => Promise<unknown>) => state.db!.transaction(async (tx) => callback({
    query: async (sql: string, values: unknown[]) => {
      const result = await tx.query(sql, values);
      return { rows: result.rows, rowCount: sql.trimStart().startsWith("SELECT") ? result.rows.length : result.affectedRows ?? result.rows.length };
    },
  })),
}));
vi.mock("./repository", async (importOriginal) => ({
  ...await importOriginal<typeof import("./repository")>(),
  playerWinTarget: async () => ({ dota_id: "200", positions: "1/5" }),
}));
vi.mock("./service", () => ({ calculateSeasonRankedWins: state.stratz }));
import { updateOrganizerRankedWins } from "./organizer-service";
const input = { roundId: 12, playerId: "100", positions: "1/5", source: "stratz" as const,
  resetManual: true, primaryWins: 0, secondaryWins: 0 };
const fresh = () => ({ primaryRole: 1, secondaryRole: 5, primaryWins: 2, secondaryWins: 1, checkedAt: new Date().toISOString() });
async function saved() {
  return (await state.db!.query("SELECT round_id,player_id,source,primary_wins FROM season_ranked_win_checks ORDER BY round_id,player_id")).rows;
}
beforeEach(async () => {
  state.db = new PGlite();
  state.stratz.mockReset().mockImplementation(async () => fresh());
  await state.db.exec(`
    CREATE TABLE tournaments (id INT PRIMARY KEY, tournament_type TEXT);
    INSERT INTO tournaments VALUES (21,'seasonal');
    CREATE TABLE season_rounds (id INT PRIMARY KEY,tournament_id INT,scheduled_at TIMESTAMPTZ);
    INSERT INTO season_rounds VALUES (12,21,'2026-11-27 22:00+03');
    CREATE TABLE season_round_registrations (round_id INT,player_id BIGINT);
    INSERT INTO season_round_registrations VALUES (12,100);
    CREATE TABLE season_ranked_win_checks (round_id INT,player_id BIGINT,primary_role INT,
      secondary_role INT,primary_wins INT,secondary_wins INT,checked_at TIMESTAMPTZ,source TEXT,
      PRIMARY KEY(round_id,player_id));
    INSERT INTO season_ranked_win_checks VALUES
      (12,100,1,5,20,10,'2026-11-20 10:00+03','manual'),
      (11,100,1,5,30,20,'2026-11-01 10:00+03','manual'),
      (12,101,1,5,40,30,'2026-11-20 10:00+03','manual');
    CREATE TABLE tournament_audit_log (tournament_id INT,actor_discord_id TEXT,action TEXT,
      entity_type TEXT,entity_id TEXT,details JSONB);
  `);
});
afterEach(async () => { await state.db?.close(); });
it("replaces only the selected manual snapshot with fresh lower Stratz values and audits the old counts", async () => {
  await updateOrganizerRankedWins(input, "999");
  expect(await saved()).toEqual([
    {round_id:11,player_id:100,primary_wins:30,source:"manual"},
    {round_id:12,player_id:100,primary_wins:2,source:"stratz"},
    {round_id:12,player_id:101,primary_wins:40,source:"manual"},
  ]);
  expect((await state.db!.query<{details:unknown}>("SELECT details FROM tournament_audit_log")).rows[0].details)
    .toMatchObject({resetManual:true,source:"stratz",previousManualWins:{primary_wins:20,secondary_wins:10}});
});
it("keeps the lock when Stratz is unavailable", async () => {
  const before = await saved();
  state.stratz.mockRejectedValue(new Error("Stratz unavailable"));
  await expect(updateOrganizerRankedWins(input,"999")).rejects.toThrow("Stratz unavailable");
  expect(await saved()).toEqual(before);
});
it("rejects a manual correction made while Stratz was loading", async () => {
  state.stratz.mockImplementation(async () => {
    await state.db!.exec("UPDATE season_ranked_win_checks SET primary_wins=25,checked_at=NOW() WHERE round_id=12 AND player_id=100");
    return fresh();
  });
  await expect(updateOrganizerRankedWins(input,"999")).rejects.toMatchObject({status:409});
  expect(await saved()).toContainEqual({round_id:12,player_id:100,primary_wins:25,source:"manual"});
});
it("rolls back the deletion when saving Stratz fails", async () => {
  const before = await saved();
  await state.db!.exec("ALTER TABLE season_ranked_win_checks ADD CHECK (source <> 'stratz')");
  await expect(updateOrganizerRankedWins(input,"999")).rejects.toThrow();
  expect(await saved()).toEqual(before);
});
