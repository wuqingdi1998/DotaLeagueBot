import { query } from "./db";
import { normalizeDotaAccountId } from "./player-profile";

export type LinkedArchiveProfile = {
  playerId: string;
  primaryNickname: string;
  aliases: string[];
};

type LinkedArchiveRow = {
  player_id: string;
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
       SELECT member.identity_id
       FROM players player
       JOIN player_identity_members member
         ON member.player_id = player.discord_id
       WHERE player.steam_id32 = $1
         AND player.is_archived = FALSE
     )
     SELECT
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
     ORDER BY LOWER(archived.ingame_name), archived.discord_id`,
    [dotaId],
  );

  return rows.map((row) => ({
    playerId: row.player_id,
    primaryNickname: row.primary_nickname,
    aliases: row.aliases ?? [],
  }));
}
