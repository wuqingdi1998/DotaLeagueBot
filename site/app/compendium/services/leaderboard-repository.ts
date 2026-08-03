import { query } from "@/lib/db";
import type { CompendiumLeaderboardEntry } from "../model/leaderboard";

type CompendiumLeaderboardRow = {
  rank: number;
  player_id: string;
  dota_id: string;
  player_name: string;
  avatar_url: string | null;
  total_stars: number;
};

export async function loadCompendiumLeaderboard(): Promise<
  CompendiumLeaderboardEntry[]
> {
  const rows = await query<CompendiumLeaderboardRow>(
    `SELECT
       (RANK() OVER (ORDER BY star_total.total_stars DESC))::int AS rank,
       player.discord_id::text AS player_id,
       player.steam_id32::text AS dota_id,
       player.ingame_name AS player_name,
       COALESCE(
         NULLIF(player.avatar_url, ''),
         NULLIF(latest_session.discord_avatar_url, '')
       ) AS avatar_url,
       star_total.total_stars::int AS total_stars
     FROM compendium_player_star_totals star_total
     JOIN players player ON player.discord_id = star_total.player_id
     LEFT JOIN LATERAL (
       SELECT session.discord_avatar_url
       FROM web_sessions session
       WHERE session.discord_id = player.discord_id
         AND session.discord_avatar_url IS NOT NULL
       ORDER BY session.created_at DESC
       LIMIT 1
     ) latest_session ON TRUE
     WHERE star_total.total_stars > 0
       AND player.is_archived = FALSE
       AND player.steam_id32 BETWEEN 1 AND 4294967295
     ORDER BY
       star_total.total_stars DESC,
       LOWER(player.ingame_name),
       player.discord_id`,
  );

  return rows.map((row) => ({
    rank: Number(row.rank),
    playerId: row.player_id,
    dotaId: row.dota_id,
    playerName: row.player_name,
    avatarUrl: row.avatar_url,
    totalStars: Number(row.total_stars),
  }));
}
