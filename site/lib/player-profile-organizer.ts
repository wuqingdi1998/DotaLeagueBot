import { query } from "./db";
import { normalizeDotaAccountId } from "./player-profile";

export type LinkedArchiveProfile = {
  kind: "archive" | "historical";
  playerId: string | null;
  primaryNickname: string;
  aliases: string[];
};

type LinkedArchiveRow = {
  profile_kind: "archive" | "historical";
  player_id: string | null;
  primary_nickname: string;
  aliases: string[];
};

export async function loadLinkedArchiveProfiles(
  requestedDotaId: string,
): Promise<LinkedArchiveProfile[]> {
  const dotaId = normalizeDotaAccountId(requestedDotaId);
  if (!dotaId) return [];

  const rows = await query<LinkedArchiveRow>(
    `WITH target_identity AS (
       SELECT
         member.identity_id,
         player.discord_id AS registered_player_id,
         player.ingame_name AS current_nickname
       FROM players player
       JOIN player_identity_members member
         ON member.player_id = player.discord_id
       WHERE player.steam_id32 = $1
         AND player.is_archived = FALSE
     ),
     archive_profiles AS (
       SELECT
         'archive'::text AS profile_kind,
         archived.discord_id::text AS player_id,
         archived.ingame_name AS primary_nickname,
         ARRAY_AGG(
           DISTINCT history.nickname
           ORDER BY history.nickname
         ) FILTER (WHERE history.nickname IS NOT NULL) AS aliases
       FROM target_identity target
       JOIN player_identity_members member
         ON member.identity_id = target.identity_id
       JOIN players archived
         ON archived.discord_id = member.player_id
        AND archived.is_archived = TRUE
       LEFT JOIN player_nickname_history history
         ON history.player_id = archived.discord_id
       GROUP BY archived.discord_id, archived.ingame_name
     ),
     historical_profiles AS (
       SELECT
         'historical'::text AS profile_kind,
         NULL::text AS player_id,
         history.nickname AS primary_nickname,
         ARRAY[history.nickname]::text[] AS aliases
       FROM target_identity target
       JOIN player_nickname_history history
         ON history.player_id = target.registered_player_id
       WHERE LOWER(BTRIM(history.nickname)) <>
         LOWER(BTRIM(target.current_nickname))
         AND NOT EXISTS (
           SELECT 1
           FROM archive_profiles archive
           WHERE LOWER(BTRIM(archive.primary_nickname)) =
               LOWER(BTRIM(history.nickname))
             OR EXISTS (
               SELECT 1
               FROM UNNEST(archive.aliases) AS alias(nickname)
               WHERE LOWER(BTRIM(alias.nickname)) =
                 LOWER(BTRIM(history.nickname))
             )
         )
     )
     SELECT
       profile_kind,
       player_id,
       primary_nickname,
       aliases
     FROM (
       SELECT * FROM archive_profiles
       UNION ALL
       SELECT * FROM historical_profiles
     ) profiles
     ORDER BY LOWER(primary_nickname), player_id NULLS LAST`,
    [dotaId],
  );

  return rows.map((row) => ({
    kind: row.profile_kind,
    playerId: row.player_id,
    primaryNickname: row.primary_nickname,
    aliases: row.aliases ?? [],
  }));
}
