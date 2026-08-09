import { query } from "./db";
import type { PlayerMedals } from "./player-profile";

export type HallOfFamePlayer = {
  identityId: string;
  dotaId: string | null;
  isArchive: boolean;
  nickname: string;
  avatarUrl: string | null;
  medals: PlayerMedals;
};

export async function loadHallOfFame(): Promise<HallOfFamePlayer[]> {
  const rows = await query<{
    identity_id: string;
    dota_id: string | null;
    is_archive: boolean;
    nickname: string;
    avatar_url: string | null;
    gold: number;
    silver: number;
    bronze: number;
  }>(
    `SELECT
       identity.id::text AS identity_id,
       active_player.steam_id32::text AS dota_id,
       (active_player.discord_id IS NULL) AS is_archive,
       COALESCE(
         active_player.ingame_name,
         identity.primary_nickname
       ) AS nickname,
       COALESCE(
         NULLIF(active_player.avatar_url, ''),
         NULLIF(latest_session.discord_avatar_url, '')
       ) AS avatar_url,
       COUNT(medal.id) FILTER (WHERE medal.medal_type = 'gold')::int AS gold,
       COUNT(medal.id) FILTER (WHERE medal.medal_type = 'silver')::int AS silver,
       COUNT(medal.id) FILTER (WHERE medal.medal_type = 'bronze')::int AS bronze
     FROM player_identities identity
     JOIN player_identity_members member ON member.identity_id = identity.id
     JOIN player_medals medal ON medal.player_id = member.player_id
     LEFT JOIN players active_player
       ON active_player.discord_id = identity.registered_player_id
      AND active_player.is_archived = FALSE
     LEFT JOIN LATERAL (
       SELECT session.discord_avatar_url
       FROM web_sessions session
       WHERE session.discord_id = active_player.discord_id
         AND session.discord_avatar_url IS NOT NULL
       ORDER BY session.created_at DESC
       LIMIT 1
     ) latest_session ON TRUE
     JOIN tournaments medal_tournament
       ON medal_tournament.id = medal.tournament_id
      AND medal_tournament.tournament_type IN ('seasonal', 'seasonal_cup')
     GROUP BY
       identity.id,
       identity.primary_nickname,
       active_player.discord_id,
       active_player.steam_id32,
       active_player.ingame_name,
       active_player.avatar_url,
       latest_session.discord_avatar_url
     ORDER BY
       gold DESC,
       silver DESC,
       bronze DESC,
       LOWER(COALESCE(active_player.ingame_name, identity.primary_nickname)),
       identity.id`,
  );

  return rows.map((row) => ({
    identityId: row.identity_id,
    dotaId: row.dota_id,
    isArchive: row.is_archive,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    medals: {
      gold: row.gold,
      silver: row.silver,
      bronze: row.bronze,
    },
  }));
}
