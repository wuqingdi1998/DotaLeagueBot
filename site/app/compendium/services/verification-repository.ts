import { randomUUID } from "node:crypto";
import { one, query, transaction } from "@/lib/db";
import { VERIFICATION_LEASE_SECONDS, nextVerificationAttempt, type VerificationSnapshot, type VerificationRequest } from "../model/verification-retries";
import { clanOutingCompletionLocks } from "./clan-outing-completion-locks";

type RequestRow = {
  id: string; player_id: string; player_name: string; snapshot: VerificationSnapshot;
  status: VerificationRequest["status"]; started_at: Date; next_attempt_at: Date | null;
  attempts: number; manual_attempts: number; last_error: string | null; notified_at: Date | null; is_checking: boolean;
};
const columns = `request.id::text, request.player_id::text, player.ingame_name AS player_name,
  request.snapshot, request.status, request.started_at, request.next_attempt_at,
  request.attempts, request.manual_attempts, request.last_error, request.notified_at,
  COALESCE(request.lease_until > NOW(), FALSE) AS is_checking`;
function fromRow(row: RequestRow): VerificationRequest {
  return { id: row.id, playerId: row.player_id, playerName: row.player_name, snapshot: row.snapshot,
    status: row.status, startedAt: row.started_at.toISOString(), nextAttemptAt: row.next_attempt_at?.toISOString() ?? null,
    attempts: row.attempts, manualAttempts: row.manual_attempts, lastError: row.last_error, notifiedAt: row.notified_at?.toISOString() ?? null,
    isChecking: row.is_checking };
}

export function verificationCompletionLock(playerId: string, snapshot: VerificationSnapshot): string {
  return snapshot.kind === "daily" ? `compendium-quest-mutation:${playerId}:${snapshot.questId}`
    : snapshot.kind === "rune" ? `compendium-rune-completion:${playerId}:${snapshot.dateKey}`
      : snapshot.kind === "clan_outing" ? clanOutingCompletionLocks(playerId, snapshot.dateKey)[0]
        : `compendium-star-race:${playerId}:${snapshot.dateKey}`;
}
export const verificationCompletedSql = `CASE request.challenge_kind
  WHEN 'daily' THEN EXISTS (SELECT 1 FROM compendium_user_quest_completions c WHERE c.player_id = request.player_id AND c.daily_quest_id::text = request.quest_key)
  WHEN 'rune' THEN EXISTS (SELECT 1 FROM october_compendium_rune_challenge_completions c WHERE c.player_id = request.player_id AND c.moscow_date = request.moscow_date)
  WHEN 'clan_outing' THEN EXISTS (SELECT 1 FROM october_compendium_clan_outing_completions c WHERE c.player_id = request.player_id AND c.moscow_date = request.moscow_date)
  ELSE EXISTS (SELECT 1 FROM compendium_star_race_quest_completions c WHERE c.player_id = request.player_id AND c.moscow_date = request.moscow_date) END`;

export async function enqueueVerification(playerId: string, snapshot: VerificationSnapshot, error: string): Promise<VerificationRequest | null> {
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [verificationCompletionLock(playerId, snapshot)]);
    // Check completion after insertion too: an award may have committed before the request existed.
    await client.query(`INSERT INTO october_compendium_verification_requests(player_id, moscow_date, challenge_kind, quest_key, snapshot, last_error)
      VALUES ($1, $2::date, $3, $4, $5::jsonb, $6) ON CONFLICT DO NOTHING`,
    [playerId, snapshot.dateKey, snapshot.kind, snapshot.questId, JSON.stringify(snapshot), error]);
    await client.query(`UPDATE october_compendium_verification_requests request SET status = 'completed',
      next_attempt_at = NULL, finished_at = NOW(), last_error = NULL
      WHERE player_id = $1 AND moscow_date = $2::date AND challenge_kind = $3 AND quest_key = $4
        AND status <> 'completed' AND (${verificationCompletedSql})`, [playerId, snapshot.dateKey, snapshot.kind, snapshot.questId]);
    const row = await client.query<RequestRow>(`SELECT ${columns} FROM october_compendium_verification_requests request
      JOIN players player ON player.discord_id = request.player_id
      WHERE request.player_id = $1 AND moscow_date = $2::date AND challenge_kind = $3 AND quest_key = $4`,
    [playerId, snapshot.dateKey, snapshot.kind, snapshot.questId]);
    return row.rows[0] ? fromRow(row.rows[0]) : null;
  });
}

export async function listVerificationRequests(): Promise<VerificationRequest[]> {
  return (await query<RequestRow>(`SELECT ${columns} FROM october_compendium_verification_requests request
    JOIN players player ON player.discord_id = request.player_id
    WHERE request.status IN ('pending', 'exhausted')
    ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'exhausted' THEN 1 ELSE 2 END, started_at DESC`)).map(fromRow);
}

export async function claimVerification(id?: string): Promise<{ request: VerificationRequest; token: string } | null> {
  const token = randomUUID();
  const row = await one<RequestRow>(`WITH claimed AS (
    SELECT id FROM october_compendium_verification_requests WHERE
      ($1::bigint IS NOT NULL AND id = $1 AND status IN ('pending', 'exhausted')
       OR $1::bigint IS NULL AND status = 'pending' AND next_attempt_at <= NOW())
      AND (lease_until IS NULL OR lease_until <= NOW())
    ORDER BY next_attempt_at, id FOR UPDATE SKIP LOCKED LIMIT 1
  ), updated AS (
    UPDATE october_compendium_verification_requests request SET lease_token = $2,
      lease_until = NOW() + make_interval(secs => $3),
      attempts = attempts + CASE WHEN $1::bigint IS NULL THEN 1 ELSE 0 END,
      manual_attempts = manual_attempts + CASE WHEN $1::bigint IS NULL THEN 0 ELSE 1 END
    FROM claimed WHERE request.id = claimed.id RETURNING request.*
  ) SELECT ${columns} FROM updated request JOIN players player ON player.discord_id = request.player_id`,
  [id ?? null, token, VERIFICATION_LEASE_SECONDS]);
  return row ? { request: fromRow(row), token } : null;
}

export async function finishVerificationAttempt(request: VerificationRequest, token: string, error: string, isManual: boolean, now = new Date()) {
  const next = nextVerificationAttempt(request.startedAt, now);
  // Extra checks never move a scheduled deadline or turn an exhausted request back into pending.
  await query(`UPDATE october_compendium_verification_requests SET last_error = $3,
    lease_until = NULL, lease_token = NULL,
    status = CASE WHEN NOT $4 AND $5::timestamptz IS NULL THEN 'exhausted' ELSE status END,
    next_attempt_at = CASE WHEN $4 THEN next_attempt_at ELSE $5::timestamptz END,
    finished_at = CASE WHEN NOT $4 AND $5::timestamptz IS NULL THEN NOW() ELSE finished_at END,
    notification_retry_at = CASE WHEN NOT $4 AND $5::timestamptz IS NULL THEN NOW() ELSE notification_retry_at END
    WHERE id = $1 AND lease_token = $2 AND status IN ('pending', 'exhausted')`,
  [request.id, token, error.slice(0, 1000), isManual, next?.at ?? null]);
}
