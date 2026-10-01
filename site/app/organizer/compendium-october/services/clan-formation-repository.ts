import { one, query, transaction } from "@/lib/db";
import type { OctoberClanAssignment } from "../model/clan-assignment";
import type { OctoberClanId } from "../model/clans";
import type { OctoberOpenDotaActivity } from "./opendota-clan-activity";

export type OctoberFormationCandidateRecord = {
  discordId: string;
  dotaId: string;
  reservation: OctoberClanId | null;
  previousCompendiumStars: number;
  internalRating: number;
  rankTier: number;
};

type CandidateRow = {
  discord_id: string;
  dota_id: string;
  clan_id: OctoberClanId | null;
  previous_compendium_stars: number;
  internal_rating: number;
  rank_tier: number;
};

export type OctoberFormationStatus = "pending" | "running" | "complete" | "failed";

export async function loadOctoberFormationStatus(): Promise<OctoberFormationStatus> {
  const row = await one<{ status: OctoberFormationStatus }>(
    "SELECT status FROM october_compendium_clan_formation WHERE singleton = TRUE",
  );
  return row?.status ?? "pending";
}

export async function claimOctoberClanFormation(): Promise<{
  shouldRun: boolean;
  status: OctoberFormationStatus;
}> {
  const row = await one<{ status: OctoberFormationStatus }>(
    `UPDATE october_compendium_clan_formation
     SET status = 'running',
         attempts = attempts + 1,
         started_at = NOW(),
         completed_at = NULL,
         error_message = NULL,
         updated_at = NOW()
     WHERE singleton = TRUE
       AND status <> 'complete'
       AND (status <> 'running' OR updated_at < NOW() - INTERVAL '20 minutes')
     RETURNING status`,
  );
  if (row) return { shouldRun: true, status: row.status };
  const status = await loadOctoberFormationStatus();
  return { shouldRun: false, status };
}

export async function loadOctoberFormationCandidates(): Promise<
  OctoberFormationCandidateRecord[]
> {
  const rows = await query<CandidateRow>(
    `SELECT
       player.discord_id::text AS discord_id,
       player.steam_id32::text AS dota_id,
       reservation.clan_id,
       COALESCE(stars.total_stars, 0)::int AS previous_compendium_stars,
       COALESCE(player.internal_rating, 0)::int AS internal_rating,
       COALESCE(player.rank_tier, 0)::int AS rank_tier
     FROM players player
     LEFT JOIN october_compendium_clan_reservations reservation
       ON reservation.player_id = player.discord_id
     LEFT JOIN compendium_player_star_totals stars
       ON stars.player_id = player.discord_id
     WHERE player.is_archived = FALSE
     ORDER BY player.discord_id`,
  );
  return rows.map((row) => ({
    discordId: row.discord_id,
    dotaId: row.dota_id,
    reservation: row.clan_id,
    previousCompendiumStars: Number(row.previous_compendium_stars),
    internalRating: Number(row.internal_rating),
    rankTier: Number(row.rank_tier),
  }));
}

export async function completeOctoberClanFormation(input: {
  candidates: readonly OctoberFormationCandidateRecord[];
  activityByPlayer: ReadonlyMap<string, OctoberOpenDotaActivity>;
  assignments: readonly OctoberClanAssignment[];
}): Promise<void> {
  const activityRows = input.candidates.map((candidate) => ({
    playerId: candidate.discordId,
    previousCompendiumStars: candidate.previousCompendiumStars,
    matchesLastThreeMonths:
      input.activityByPlayer.get(candidate.discordId)?.matchesLastThreeMonths ?? 0,
    rankedMatchesLastThreeMonths:
      input.activityByPlayer.get(candidate.discordId)?.rankedMatchesLastThreeMonths ?? 0,
    lastMatchAt: input.activityByPlayer.get(candidate.discordId)?.lastMatchAt ?? null,
    internalRating: candidate.internalRating,
    rankTier: candidate.rankTier,
    openDotaStatus:
      input.activityByPlayer.get(candidate.discordId)?.status ?? "unavailable",
  }));
  await transaction(async (client) => {
    await client.query("DELETE FROM october_compendium_clan_activity");
    await client.query(
      `INSERT INTO october_compendium_clan_activity
         (player_id, previous_compendium_stars, matches_last_three_months,
          ranked_matches_last_three_months, last_match_at, internal_rating,
          rank_tier, open_dota_status, fetched_at)
       SELECT
         item.player_id::bigint, item.previous_compendium_stars,
         item.matches_last_three_months, item.ranked_matches_last_three_months,
         item.last_match_at, item.internal_rating, item.rank_tier,
         item.open_dota_status, NOW()
       FROM jsonb_to_recordset($1::jsonb) AS item(
         player_id text, previous_compendium_stars int,
         matches_last_three_months int, ranked_matches_last_three_months int,
         last_match_at timestamptz, internal_rating int, rank_tier int,
         open_dota_status varchar
       )`,
      [JSON.stringify(activityRows.map((row) => ({
        player_id: row.playerId,
        previous_compendium_stars: row.previousCompendiumStars,
        matches_last_three_months: row.matchesLastThreeMonths,
        ranked_matches_last_three_months: row.rankedMatchesLastThreeMonths,
        last_match_at: row.lastMatchAt,
        internal_rating: row.internalRating,
        rank_tier: row.rankTier,
        open_dota_status: row.openDotaStatus,
      })))],
    );
    await client.query("DELETE FROM october_compendium_clan_members");
    await client.query(
      `INSERT INTO october_compendium_clan_members
         (player_id, clan_id, assigned_at, total_points, assignment_source, activity_score)
       SELECT item.player_id::bigint, item.clan_id, NOW(), 0,
              item.assignment_source, item.activity_score
       FROM jsonb_to_recordset($1::jsonb) AS item(
         player_id text, clan_id varchar, assignment_source varchar,
         activity_score numeric
       )`,
      [JSON.stringify(input.assignments.map((assignment) => ({
        player_id: assignment.discordId,
        clan_id: assignment.clanId,
        assignment_source: assignment.source,
        activity_score: assignment.activityScore,
      })))],
    );
    await client.query(
      `UPDATE october_compendium_clan_formation
       SET status = 'complete', completed_at = NOW(), error_message = NULL,
           updated_at = NOW()
       WHERE singleton = TRUE`,
    );
  });
}

export async function failOctoberClanFormation(error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : "Неизвестная ошибка";
  await query(
    `UPDATE october_compendium_clan_formation
     SET status = 'failed', error_message = LEFT($1, 1000), updated_at = NOW()
     WHERE singleton = TRUE`,
    [message],
  );
}
