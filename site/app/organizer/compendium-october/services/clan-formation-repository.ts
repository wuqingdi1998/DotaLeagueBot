import { one, query } from "@/lib/db";
import { COMPENDIUM_EXCLUDED_ROLE_NAME } from "@/app/compendium/services/participant-access";
import type { OctoberClanId } from "../model/clans";
import type { OctoberFormationStatus } from "../model/launch-report";

export type OctoberFormationCandidateRecord = {
  discordId: string;
  dotaId: string;
  playerName: string;
  reservation: OctoberClanId | null;
  previousCompendiumStars: number;
  internalRating: number;
  rankTier: number;
};

type CandidateRow = {
  discord_id: string;
  dota_id: string;
  player_name: string;
  clan_id: OctoberClanId | null;
  previous_compendium_stars: number;
  internal_rating: number;
  rank_tier: number;
};

export async function loadOctoberFormationStatus(): Promise<OctoberFormationStatus> {
  const row = await one<{ status: OctoberFormationStatus }>(
    "SELECT status FROM october_compendium_clan_formation WHERE singleton = TRUE",
  );
  return row?.status ?? "pending";
}

export async function claimOctoberClanPreparation(): Promise<{
  shouldRun: boolean;
  status: OctoberFormationStatus;
}> {
  const row = await one<{ status: OctoberFormationStatus }>(
    `UPDATE october_compendium_clan_formation
     SET status = 'preparing',
         attempts = attempts + 1,
         started_at = NOW(),
         completed_at = NULL,
         error_message = NULL,
         updated_at = NOW()
     WHERE singleton = TRUE
       AND (
         status IN ('pending', 'failed')
         OR (status = 'preparing' AND updated_at < NOW() - INTERVAL '20 minutes')
       )
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
       player.ingame_name AS player_name,
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
       AND NOT EXISTS (
         SELECT 1
         FROM player_discord_roles role
         WHERE role.player_id = player.discord_id
           AND role.role_name = $1
       )
     ORDER BY player.discord_id`,
    [COMPENDIUM_EXCLUDED_ROLE_NAME],
  );
  return rows.map((row) => ({
    discordId: row.discord_id,
    dotaId: row.dota_id,
    playerName: row.player_name,
    reservation: row.clan_id,
    previousCompendiumStars: Number(row.previous_compendium_stars),
    internalRating: Number(row.internal_rating),
    rankTier: Number(row.rank_tier),
  }));
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
