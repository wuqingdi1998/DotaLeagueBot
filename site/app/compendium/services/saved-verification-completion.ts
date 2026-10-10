import { transaction } from "@/lib/db";
import { CompendiumError } from "../model/errors";
import { starRaceWeekByDate } from "../model/star-race";
import type { VerificationRequest } from "../model/verification-retries";
import type { VerifiedChallengeEvidence } from "./saved-verification-evaluation";
import { verificationCompletedSql, verificationCompletionLock } from "./verification-repository";
import { queueCompendiumMatchAudits } from "./match-audit-repository";
import { clanOutingCompletionLocks } from "./clan-outing-completion-locks";

/** Uses the same uniqueness constraints and locks as player/admin awards. No manual award is inferred from a provider failure. */
export async function recordSavedVerification(request: VerificationRequest, token: string, evidence: VerifiedChallengeEvidence, now = new Date()): Promise<void> {
  const snapshot = request.snapshot;
  const earnedAt = new Date(Math.min(now.getTime(), Date.parse(snapshot.endsAt) - 1)).toISOString();
  await transaction(async (client) => {
    const locks = snapshot.kind === "clan_outing"
      ? clanOutingCompletionLocks(request.playerId, snapshot.dateKey, evidence.partnerPlayerId)
      : [verificationCompletionLock(request.playerId, snapshot)];
    for (const lock of locks) await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [lock]);
    const lease = await client.query(`SELECT 1 FROM october_compendium_verification_requests request
      WHERE id = $1 AND lease_token = $2 AND status IN ('pending', 'exhausted') AND lease_until > NOW()`, [request.id, token]);
    if (!lease.rowCount) return;
    const already = await client.query(`SELECT 1 FROM october_compendium_verification_requests request WHERE id = $1 AND (${verificationCompletedSql})`, [request.id]);
    if (already.rowCount) {
      await client.query(`UPDATE october_compendium_verification_requests SET status = 'completed', finished_at = NOW(),
        next_attempt_at = NULL, lease_token = NULL, lease_until = NULL, last_error = NULL WHERE id = $1`, [request.id]);
      return;
    }
    const memberIds = snapshot.kind === "clan_outing" && evidence.partnerPlayerId
      ? [request.playerId, evidence.partnerPlayerId] : [request.playerId];
    const member = await client.query<{ player_id: string }>(`SELECT member.player_id::text FROM october_compendium_clan_members member
      JOIN players player ON player.discord_id = member.player_id
      WHERE member.player_id = ANY($1::bigint[]) AND player.is_archived = FALSE
        AND member.assigned_at <= $2::timestamptz AND compendium_stars_count_for_player(member.player_id, $2::timestamptz)
      ORDER BY member.player_id FOR UPDATE OF member`, [memberIds, earnedAt]);
    if (!member.rows.some((member) => member.player_id === request.playerId)) throw new CompendiumError("STALE_QUEST", "Участник больше не имеет права на зачёт за эту дату");
    const win = evidence.wins[0];
    if (!win) throw new Error("Verified challenge has no match evidence");
    const values = [request.playerId, snapshot.dateKey, snapshot.rewardStars, earnedAt];
    let inserted;
    if (snapshot.kind === "daily") {
      inserted = await client.query(`INSERT INTO compendium_user_quest_completions
        (player_id, daily_quest_id, reward_amount, completed_at, matched_match_id, matched_hero_id)
        SELECT $1, quest.id, $3, $4::timestamptz, $6, $7 FROM compendium_daily_quests quest
        JOIN compendium_daily_quest_sets quest_set ON quest_set.id = quest.quest_set_id
        WHERE quest.id = $5 AND quest.player_id = $1 AND quest_set.moscow_date = $2::date
        ON CONFLICT (player_id, daily_quest_id) DO NOTHING RETURNING id`,
      [...values, snapshot.questId, win.matchId, win.heroId]);
    } else if (snapshot.kind === "star_race") {
      inserted = await client.query(`INSERT INTO compendium_star_race_quest_completions
        (player_id, moscow_date, reward_amount, completed_at, match_evidence_complete)
        VALUES ($1, $2::date, $3, $4::timestamptz, TRUE)
        ON CONFLICT (player_id, moscow_date) DO NOTHING RETURNING id`, values);
      if (inserted.rowCount) {
        for (const [index, match] of evidence.wins.entries()) {
          await client.query(`INSERT INTO compendium_star_race_quest_wins
            (completion_id, player_id, position, hero_id, matched_match_id) VALUES ($1, $2, $3, $4, $5)`,
          [inserted.rows[0].id, request.playerId, index + 1, match.heroId, match.matchId]);
        }
      }
    } else {
      const table = snapshot.kind === "rune" ? "october_compendium_rune_challenge_completions" : "october_compendium_clan_outing_completions";
      const column = snapshot.kind === "rune" ? "hero_id" : "partner_player_id";
      inserted = await client.query(`INSERT INTO ${table}
        (player_id, moscow_date, reward_amount, completed_at, matched_match_id, ${column})
        VALUES ($1, $2::date, $3, $4::timestamptz, $5, $6) ON CONFLICT DO NOTHING RETURNING id`,
      [...values, win.matchId, snapshot.kind === "rune" ? win.heroId : evidence.partnerPlayerId]);
    }
    if (!inserted.rowCount) throw new CompendiumError("STALE_QUEST", "Не удалось сохранить результат; требуется проверка организатора");
    if (snapshot.kind === "daily" || snapshot.kind === "clan_outing") {
      await client.query(`UPDATE october_compendium_clan_members SET total_points = total_points + $2 WHERE player_id = $1`, [request.playerId, snapshot.rewardStars]);
    }
    if (snapshot.kind === "clan_outing" && member.rows.some((member) => member.player_id === evidence.partnerPlayerId)) {
      const partner = await client.query(`INSERT INTO october_compendium_clan_outing_completions
        (player_id, partner_player_id, moscow_date, matched_match_id, reward_amount, completed_at)
        VALUES ($1, $2, $3::date, $4, $5, $6::timestamptz)
        ON CONFLICT (player_id, moscow_date) DO NOTHING RETURNING id`,
      [evidence.partnerPlayerId, request.playerId, snapshot.dateKey, win.matchId, snapshot.rewardStars, earnedAt]);
      if (partner.rowCount) await client.query(`UPDATE october_compendium_clan_members SET total_points = total_points + $2 WHERE player_id = $1`, [evidence.partnerPlayerId, snapshot.rewardStars]);
    }
    await queueCompendiumMatchAudits(client, request.playerId, evidence.wins);
    const week = starRaceWeekByDate(snapshot.dateKey);
    if (week) await client.query(`DELETE FROM compendium_star_race_standings_snapshots WHERE race_start_at = $1::timestamptz`, [week.startsAt]);
  });
}
