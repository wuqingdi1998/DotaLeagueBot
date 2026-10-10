import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), one: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/db", () => mocks);
import { enqueueVerification, claimVerification, finishVerificationAttempt, listVerificationRequests } from "./verification-repository";
import { recordSavedVerification } from "./saved-verification-completion";
import { recordClanOutingPair } from "./clan-outing-repository";
import { cancelVerification } from "./cancel-verification";
import type { VerificationSnapshot } from "../model/verification-retries";

const db = new PGlite();
const source = (name: string) => readFileSync(new URL(`../../../../bot/database/migrations/${name}`, import.meta.url), "utf8");
const snapshot: VerificationSnapshot = { kind: "daily", dateKey: "2026-10-11", questId: "10", title: "Испытание 1", dotaId: "149981874",
  rewardStars: 2, startsAt: "2026-10-11T00:00:00+03:00", endsAt: "2026-10-12T00:00:00+03:00", heroIds: [7], clanMates: [], requirement: null };
beforeAll(async () => {
  await db.exec(readFileSync(new URL("../../../tests/fixtures/october-compendium.sql", import.meta.url), "utf8"));
  await db.exec(`ALTER TABLE october_compendium_clan_members ADD COLUMN assigned_at timestamptz DEFAULT '2026-10-05 00:00+03';
    CREATE TABLE october_compendium_rune_challenge_selections(player_id bigint, hero_id smallint, selected_at timestamptz);
    ALTER TABLE compendium_user_quest_completions ADD COLUMN completion_source text DEFAULT 'automatic';
    ALTER TABLE compendium_user_quest_completions ADD CONSTRAINT compendium_user_quest_completion_source_check CHECK (true);
    DELETE FROM compendium_user_quest_completions WHERE id=4;
    CREATE UNIQUE INDEX daily_once ON compendium_user_quest_completions(player_id,daily_quest_id);
    CREATE UNIQUE INDEX race_once ON compendium_star_race_quest_completions(player_id,moscow_date);
    CREATE UNIQUE INDEX rune_once ON october_compendium_rune_challenge_completions(player_id,moscow_date);
    CREATE UNIQUE INDEX outing_once ON october_compendium_clan_outing_completions(player_id,moscow_date);
    CREATE UNIQUE INDEX rune_match_once ON october_compendium_rune_challenge_completions(player_id,matched_match_id);
    CREATE SEQUENCE retry_fixture_ids START 1000;
    ALTER TABLE compendium_user_quest_completions ALTER COLUMN id SET DEFAULT nextval('retry_fixture_ids');
    ALTER TABLE compendium_star_race_quest_completions ALTER COLUMN id SET DEFAULT nextval('retry_fixture_ids');
    ALTER TABLE october_compendium_rune_challenge_completions ALTER COLUMN id SET DEFAULT nextval('retry_fixture_ids');
    ALTER TABLE october_compendium_clan_outing_completions ALTER COLUMN id SET DEFAULT nextval('retry_fixture_ids');
    ALTER TABLE compendium_star_race_quest_completions ADD COLUMN match_evidence_complete boolean DEFAULT false;
    ALTER TABLE compendium_star_race_quest_wins ADD COLUMN player_id bigint;
    INSERT INTO compendium_daily_quest_sets VALUES (10,'2026-10-11');
    INSERT INTO compendium_daily_quests VALUES (10,10,1,100),(11,10,2,100);
    CREATE FUNCTION queue_compendium_match_region_audit(bigint,bigint,text) RETURNS void LANGUAGE sql AS 'SELECT';`);
  await db.exec(source("0170_isolate_october_compendium.sql"));
  await db.exec(source("0174_compendium_review_repairs.sql").split("-- Keep archived results")[0]);
  await db.exec(source("0178_october_challenge_history.sql"));
  await db.exec(source("0179_compendium_verification_retries.sql"));
  await db.exec(source("0180_cancel_compendium_verification.sql"));
  await db.exec(source("0181_compendium_notification_cleanup.sql"));
  await db.exec(source("0182_cancelled_verification_notification_cleanup.sql"));
  await db.exec(source("0168_october_rune_challenge.sql").slice(source("0168_october_rune_challenge.sql").indexOf("CREATE OR REPLACE FUNCTION apply_october_rune_clan_points()")));
  await db.exec(source("0175_protect_star_race_evidence_clan_points.sql"));
  await db.exec(`CREATE TRIGGER october_star_race_clan_points AFTER INSERT OR UPDATE OR DELETE ON compendium_star_race_quest_completions
    FOR EACH ROW EXECUTE FUNCTION apply_october_star_race_clan_points();`);
  const rows = (result: { rows: unknown[] }) => result.rows.map((row) => Object.fromEntries(Object.entries(row as Record<string, unknown>)
    .map(([key, value]) => [key, ["started_at", "next_attempt_at", "notified_at", "completed_at"].includes(key) && value
      ? value instanceof Date ? value : new Date(String(value)) : value])));
  mocks.query.mockImplementation(async (sql: string, values: unknown[] = []) => rows(await db.query(sql, values)));
  mocks.one.mockImplementation(async (sql: string, values: unknown[] = []) => rows(await db.query(sql, values))[0] ?? null);
  mocks.transaction.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) => db.transaction(async (tx) => callback({
    query: async (sql: string, values: unknown[] = []) => { const result = await tx.query(sql, values);
      return { rows: rows(result), rowCount: result.rows.length || result.affectedRows || 0 }; },
  })));
}, 20000);
afterAll(async () => db.close());

async function storedRequest(id: string) {
  const result = await db.query<{ id: string; status: string; nextAttemptAt: Date | null }>(
    `SELECT id::text, status, next_attempt_at AS "nextAttemptAt" FROM october_compendium_verification_requests WHERE id=$1`, [id]);
  return result.rows[0];
}

it("deduplicates repeated and concurrent failures without restarting the clock or replacing the original heroes", async () => {
  const first = await enqueueVerification("100", snapshot, "OpenDota unavailable");
  const repeated = await Promise.all([enqueueVerification("100", { ...snapshot, heroIds: [2] }, "No match"), enqueueVerification("100", snapshot, "No match")]);
  expect(repeated.every((request) => request?.id === first?.id && request?.startedAt === first?.startedAt && request?.nextAttemptAt === first?.nextAttemptAt)).toBe(true);
  expect(repeated[0]?.snapshot.heroIds).toEqual([7]);
});

it("leases a request once and keeps its scheduled deadline unchanged on an extra organizer check", async () => {
  const request = (await listVerificationRequests())[0];
  const claimed = await claimVerification(request.id);
  expect(claimed).not.toBeNull();
  expect(await claimVerification(request.id)).toBeNull();
  await finishVerificationAttempt(claimed!.request, claimed!.token, "No match", true);
  const updated = (await listVerificationRequests())[0];
  expect(updated.nextAttemptAt).toBe(request.nextAttemptAt);
  expect(updated.attempts).toBe(0);
  expect(updated.manualAttempts).toBe(1);
});

it("awards Sunday after midnight only once, cancels the queue, and attributes stars to the previous week", async () => {
  const request = (await listVerificationRequests())[0];
  const claimed = (await claimVerification(request.id))!;
  const before = (await db.query<{ total_points: number }>("SELECT total_points FROM october_compendium_clan_members WHERE player_id=100")).rows[0].total_points;
  await db.exec("INSERT INTO compendium_star_race_standings_snapshots VALUES ('2026-10-05 00:00+03','[]')");
  const evidence = { wins: [{ matchId: "900111", heroId: 7, endedAt: new Date("2026-10-11T23:59:00+03:00") }] };
  await recordSavedVerification(claimed.request, claimed.token, evidence, new Date("2026-10-12T01:00:00+03:00"));
  await recordSavedVerification(claimed.request, claimed.token, evidence, new Date("2026-10-12T01:00:00+03:00"));
  const saved = await storedRequest(request.id);
  expect(saved.status).toBe("completed");
  expect(saved.nextAttemptAt).toBeNull();
  expect(await listVerificationRequests()).toEqual([]);
  expect(await claimVerification(saved.id)).toBeNull();
  expect((await db.query("SELECT total_points FROM october_compendium_clan_members WHERE player_id=100")).rows).toEqual([{ total_points: before + 2 }]);
  expect((await db.query("SELECT SUM(amount)::int AS total FROM compendium_star_race_events WHERE earned_at >= '2026-10-11 00:00+03' AND earned_at < '2026-10-12 00:00+03'")).rows).toEqual([{ total: 2 }]);
  expect((await db.query("SELECT * FROM compendium_star_race_standings_snapshots")).rows).toEqual([]);
  expect((await enqueueVerification("100", snapshot, "late failed concurrent check"))?.status).toBe("completed");
});

it("cancels pending requests when an ordinary player or manual award wins the race", async () => {
  const request = await enqueueVerification("100", { ...snapshot, questId: "11" }, "No match");
  const claimed = (await claimVerification(request!.id))!;
  await db.exec(`INSERT INTO compendium_user_quest_completions(player_id,daily_quest_id,reward_amount,completed_at,matched_hero_id,matched_match_id)
    VALUES (100,11,2,'2026-10-11 23:30+03',7,900112)`);
  await finishVerificationAttempt(claimed.request, claimed.token, "late failure", false, new Date(Date.parse(claimed.request.startedAt) + 120 * 60_000));
  expect((await storedRequest(request!.id)).status).toBe("completed");
  expect(await listVerificationRequests()).toEqual([]);
});

it("stops after the final two hour attempt and cannot be restarted by another player failure", async () => {
  const original = { ...snapshot, kind: "rune" as const, questId: snapshot.dateKey };
  const request = (await enqueueVerification("100", original, "No match"))!;
  await db.query("UPDATE october_compendium_verification_requests SET next_attempt_at=NOW()-INTERVAL '1 second' WHERE id=$1", [request.id]);
  const claimed = (await claimVerification())!;
  await finishVerificationAttempt(claimed.request, claimed.token, "OpenDota unavailable", false, new Date(Date.parse(request.startedAt) + 120 * 60_000));
  const exhausted = (await enqueueVerification("100", original, "player retried"))!;
  expect(exhausted.status).toBe("exhausted");
  expect(exhausted.nextAttemptAt).toBeNull();
  expect(await claimVerification()).toBeNull();
  expect(exhausted.startedAt).toBe(request.startedAt);
  const manual = (await claimVerification(request.id))!;
  await finishVerificationAttempt(manual.request, manual.token, "manual failed", true);
  expect((await listVerificationRequests()).find((row) => row.id === request.id)?.status).toBe("exhausted");
});

it("keeps all race evidence and cancels all four completion kinds including manual awards", async () => {
  const now = new Date("2026-10-12T01:00:00+03:00");
  const race = (await enqueueVerification("100", { ...snapshot, kind: "star_race", questId: snapshot.dateKey }, "No match"))!;
  const claimed = (await claimVerification(race.id))!;
  await recordSavedVerification(claimed.request, claimed.token, { wins: [
    { matchId: "900120", heroId: 7, endedAt: new Date("2026-10-11T22:00:00+03:00") },
    { matchId: "900121", heroId: 2, endedAt: new Date("2026-10-11T23:00:00+03:00") },
  ] }, now);
  expect((await db.query("SELECT matched_match_id::text FROM compendium_star_race_quest_wins WHERE player_id=100 ORDER BY position")).rows)
    .toEqual([{ matched_match_id: "900120" }, { matched_match_id: "900121" }]);
  const outing = (await enqueueVerification("100", { ...snapshot, kind: "clan_outing", questId: snapshot.dateKey }, "No match"))!;
  await db.exec(`INSERT INTO october_compendium_clan_outing_completions(player_id,moscow_date,reward_amount,completed_at,matched_match_id,partner_player_id,completion_source)
    VALUES (100,'2026-10-11',2,'2026-10-11 23:00+03',900122,200,'manual');
    INSERT INTO october_compendium_rune_challenge_completions(player_id,moscow_date,reward_amount,completed_at,matched_match_id,hero_id,completion_source)
    VALUES (100,'2026-10-11',2,'2026-10-11 23:00+03',900123,7,'manual');`);
  expect((await storedRequest(outing.id)).status).toBe("completed");
  expect((await storedRequest(race.id)).status).toBe("completed");
  expect(await listVerificationRequests()).toEqual([]);
});

it("awards both outing teammates once and cancels both pending requests", async () => {
  const day = { ...snapshot, kind: "clan_outing" as const, dateKey: "2026-10-10", questId: "2026-10-10",
    startsAt: "2026-10-10T00:00:00+03:00", endsAt: "2026-10-11T00:00:00+03:00" };
  const first = (await enqueueVerification("100", day, "No match"))!;
  const second = (await enqueueVerification("200", { ...day, dotaId: "200" }, "No match"))!;
  const claimed = (await claimVerification(first.id))!;
  await recordSavedVerification(claimed.request, claimed.token, {
    wins: [{ matchId: "900130", heroId: 7, endedAt: new Date("2026-10-10T23:00:00+03:00") }], partnerPlayerId: "200",
  }, new Date("2026-10-11T01:00:00+03:00"));
  expect((await db.query("SELECT COUNT(*)::int AS count FROM october_compendium_clan_outing_completions WHERE moscow_date='2026-10-10'")).rows).toEqual([{ count: 2 }]);
  const completed = await Promise.all([storedRequest(first.id), storedRequest(second.id)]);
  expect(completed).toHaveLength(2);
  expect(completed.every((row) => row.status === "completed")).toBe(true);
  expect(await listVerificationRequests()).toEqual([]);
});

it("recovers an abandoned lease after a restart and ignores the obsolete worker's result", async () => {
  await db.exec("INSERT INTO compendium_daily_quests VALUES (12,10,2,100)");
  const request = (await enqueueVerification("100", { ...snapshot, questId: "12" }, "No match"))!;
  const abandoned = (await claimVerification(request.id))!;
  await db.query("UPDATE october_compendium_verification_requests SET lease_until=NOW()-INTERVAL '1 second' WHERE id=$1", [request.id]);
  const recovered = (await claimVerification(request.id))!;
  expect(recovered.token).not.toBe(abandoned.token);
  const evidence = { wins: [{ matchId: "900140", heroId: 7, endedAt: new Date("2026-10-11T23:00:00+03:00") }] };
  await recordSavedVerification(abandoned.request, abandoned.token, evidence, new Date("2026-10-12T01:00:00+03:00"));
  await finishVerificationAttempt(abandoned.request, abandoned.token, "obsolete failure", false, new Date(Date.parse(request.startedAt) + 120 * 60_000));
  expect((await db.query("SELECT id FROM compendium_user_quest_completions WHERE daily_quest_id=12")).rows).toEqual([]);
  expect((await listVerificationRequests()).find((row) => row.id === request.id)?.status).toBe("pending");
  await recordSavedVerification(recovered.request, recovered.token, evidence, new Date("2026-10-12T01:00:00+03:00"));
  expect((await storedRequest(request.id)).status).toBe("completed");
  expect(await listVerificationRequests()).toEqual([]);
});

it("attributes a direct outing response crossing midnight to Sunday rather than the next race week", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-19T00:01:00+03:00"));
  try {
    const result = await recordClanOutingPair({ playerId: "100", partnerPlayerId: "200", dateKey: "2026-10-18", matchId: "900150", rewardStars: 2 });
    expect(result.completedAt).toBe("2026-10-18T20:59:59.999Z");
    expect((await db.query("SELECT SUM(amount)::int AS total FROM compendium_star_race_events WHERE earned_at >= '2026-10-18 00:00+03' AND earned_at < '2026-10-19 00:00+03'")).rows)
      .toEqual([{ total: 4 }]);
  } finally { vi.useRealTimers(); }
});

it("cancels an in-flight request without late awards, revival, or a restarted retry clock", async () => {
  await db.exec("INSERT INTO compendium_daily_quests VALUES (13,10,2,100)");
  const original = { ...snapshot, questId: "13" };
  const request = (await enqueueVerification("100", original, "No match"))!;
  const claimed = (await claimVerification(request.id))!;
  await cancelVerification(request.id);
  await cancelVerification(request.id);
  await recordSavedVerification(claimed.request, claimed.token, {
    wins: [{ matchId: "900160", heroId: 7, endedAt: new Date("2026-10-11T23:00:00+03:00") }],
  }, new Date("2026-10-12T01:00:00+03:00"));
  await finishVerificationAttempt(claimed.request, claimed.token, "late failure", false);
  expect((await db.query("SELECT id FROM compendium_user_quest_completions WHERE daily_quest_id=13")).rows).toEqual([]);
  expect((await storedRequest(request.id)).status).toBe("cancelled");
  expect((await storedRequest(request.id)).nextAttemptAt).toBeNull();
  expect(await listVerificationRequests()).toEqual([]);
  expect(await claimVerification(request.id)).toBeNull();
  expect(await claimVerification()).toBeNull();
  const repeated = (await enqueueVerification("100", original, "player clicked again"))!;
  expect(repeated.id).toBe(request.id);
  expect(repeated.status).toBe("cancelled");
  expect(repeated.startedAt).toBe(request.startedAt);
});

it("removes exhausted requests from organizer review and pending Discord notifications", async () => {
  const request = (await enqueueVerification("100", { ...snapshot, kind: "rune", dateKey: "2026-10-12", questId: "2026-10-12" }, "No match"))!;
  await db.query("UPDATE october_compendium_verification_requests SET status='exhausted',next_attempt_at=NULL WHERE id=$1", [request.id]);
  await cancelVerification(request.id);
  expect((await storedRequest(request.id)).status).toBe("cancelled");
  expect((await db.query("SELECT id FROM october_compendium_verification_requests WHERE status='exhausted' AND notified_at IS NULL")).rows).toEqual([]);
  expect(await listVerificationRequests()).toEqual([]);
  await cancelVerification("999999");
  await cancelVerification("1");
  expect((await storedRequest("1")).status).toBe("completed");
});

it("cleans up completed and cancelled notifications including old messages, but keeps unresolved reports", async () => {
  await db.query("UPDATE october_compendium_verification_requests SET discord_message_id=900,notified_at=NOW() WHERE id=1");
  await db.query("UPDATE october_compendium_verification_requests SET discord_message_id=901,notified_at=NOW() WHERE status='cancelled'");
  const pending = (await enqueueVerification("100", { ...snapshot, kind: "rune", dateKey: "2026-10-13", questId: "2026-10-13" }, "No match"))!;
  await db.query("UPDATE october_compendium_verification_requests SET status='exhausted',discord_message_id=902 WHERE id=$1", [pending.id]);
  const cleanupSql = `SELECT id::text,status,discord_channel_id FROM october_compendium_verification_requests
    WHERE status IN ('completed','cancelled') AND discord_message_id IS NOT NULL AND notification_deleted_at IS NULL
      AND notification_delete_retry_at <= NOW() ORDER BY id`;
  const eligible = (await db.query<{ id: string; status: string; discord_channel_id: string | null }>(cleanupSql)).rows;
  expect(eligible).toHaveLength(3);
  expect(eligible[0]).toEqual({ id: "1", status: "completed", discord_channel_id: null });
  expect(eligible.slice(1).every((row) => row.status === "cancelled")).toBe(true);
  await db.query("UPDATE october_compendium_verification_requests SET notification_delete_retry_at=NOW()+INTERVAL '5 minutes' WHERE id=1");
  expect((await db.query(cleanupSql)).rows).toEqual(eligible.slice(1));
  await db.query("UPDATE october_compendium_verification_requests SET notification_delete_retry_at=NOW(),notification_deleted_at=NOW() WHERE status IN ('completed','cancelled')");
  expect((await db.query(cleanupSql)).rows).toEqual([]);
});
