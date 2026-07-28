import { buildPlayerLinks } from "./player-profile";
import { query } from "./db";

export type ParticipantDirectoryPlayer = {
  dotaId: string;
  nickname: string;
  avatarUrl: string | null;
  tier: number | null;
  links: {
    dotabuff: string;
    stratz: string;
    steam: string;
  };
};

export async function loadParticipantDirectory(): Promise<
  ParticipantDirectoryPlayer[]
> {
  const rows = await query<{
    dota_id: string;
    nickname: string;
    avatar_url: string | null;
    tier: number | null;
  }>(
    `SELECT
       player.steam_id32::text AS dota_id,
       player.ingame_name AS nickname,
       COALESCE(
         NULLIF(player.avatar_url, ''),
         NULLIF(latest_session.discord_avatar_url, '')
       ) AS avatar_url,
       COALESCE(
         NULLIF(player.internal_rating, 0),
         CASE
           WHEN player.rank_tier >= 10 THEN player.rank_tier / 10
           WHEN player.rank_tier > 0 THEN player.rank_tier
           ELSE NULL
         END,
         latest_tier.tier
       )::int AS tier
     FROM players player
     LEFT JOIN LATERAL (
       SELECT session.discord_avatar_url
       FROM web_sessions session
       WHERE session.discord_id = player.discord_id
         AND session.discord_avatar_url IS NOT NULL
       ORDER BY session.created_at DESC
       LIMIT 1
     ) latest_session ON TRUE
     LEFT JOIN LATERAL (
       SELECT known_tier.tier
       FROM (
         SELECT
           NULLIF(
             to_jsonb(participant)->>'tier_snapshot',
             ''
           )::smallint AS tier,
           COALESCE(
             match.scheduled_at,
             round.scheduled_at,
             tournament.end_at
           ) AS recorded_at,
           participant.match_id AS source_id
         FROM season_match_participants participant
         JOIN season_matches match ON match.id = participant.match_id
         JOIN season_lobbies lobby ON lobby.id = match.lobby_id
         JOIN season_rounds round ON round.id = lobby.round_id
         JOIN tournaments tournament ON tournament.id = round.tournament_id
         WHERE participant.player_id = player.discord_id
           AND NULLIF(
             to_jsonb(participant)->>'tier_snapshot',
             ''
           ) IS NOT NULL

         UNION ALL

         SELECT
           snapshot.tier_snapshot AS tier,
           tournament.end_at AS recorded_at,
           snapshot.id AS source_id
         FROM tournament_roster_snapshots snapshot
         JOIN tournament_team_applications application
           ON application.id = snapshot.application_id
         JOIN tournaments tournament ON tournament.id = application.tournament_id
         WHERE snapshot.player_id = player.discord_id
           AND snapshot.tier_snapshot IS NOT NULL
       ) known_tier
       ORDER BY known_tier.recorded_at DESC, known_tier.source_id DESC
       LIMIT 1
     ) latest_tier ON TRUE
     WHERE player.steam_id32 IS NOT NULL
     ORDER BY LOWER(player.ingame_name), player.discord_id`,
  );

  return rows.map((row) => ({
    dotaId: row.dota_id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    tier: row.tier,
    links: buildPlayerLinks(row.dota_id),
  }));
}
