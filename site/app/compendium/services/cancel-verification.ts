import { transaction } from "@/lib/db";
import type { VerificationSnapshot } from "../model/verification-retries";
import { verificationCompletionLock } from "./verification-repository";

/** Retains the request identity so extra player failures cannot restart a cancelled queue. */
export async function cancelVerification(id: string): Promise<void> {
  await transaction(async (client) => {
    const result = await client.query<{ player_id: string; snapshot: VerificationSnapshot }>(
      "SELECT player_id::text, snapshot FROM october_compendium_verification_requests WHERE id=$1", [id]);
    const request = result.rows[0];
    if (!request) return;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [verificationCompletionLock(request.player_id, request.snapshot)]);
    await client.query(`UPDATE october_compendium_verification_requests SET status='cancelled',
      next_attempt_at=NULL, lease_token=NULL, lease_until=NULL, finished_at=NOW()
      WHERE id=$1 AND status IN ('pending', 'exhausted')`, [id]);
  });
}
