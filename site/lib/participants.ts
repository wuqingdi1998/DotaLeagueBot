import { buildPlayerLinks, normalizeDotaAccountId } from "./player-profile";
import { query } from "./db";

export const participantTierMinimum = 1;
export const participantTierMaximum = 12;

export type ParticipantDirectoryPlayer = {
  kind: "registered" | "archive";
  identityId: string;
  discordId: string | null;
  dotaId: string | null;
  nickname: string;
  aliases: string[];
  avatarUrl: string | null;
  positions: string | null;
  primaryRole: number | null;
  secondaryRole: number | null;
  tier: number | null;
  links: {
    dotabuff: string;
    stratz: string;
    steam: string;
  } | null;
};

type RegisteredParticipantRow = {
  identity_id: string;
  discord_id: string;
  dota_id: string;
  nickname: string;
  aliases: string[];
  avatar_url: string | null;
  positions: string | null;
  tier: number | null;
};

type ArchiveParticipantRow = {
  identity_id: string;
  nickname: string;
  aliases: string[];
  tier: number | null;
};

function roleAt(positions: string | null, index: number): number | null {
  if (!positions) return null;
  const value = Number(positions.split("/")[index]);
  return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
}

function registeredParticipant(
  row: RegisteredParticipantRow,
): ParticipantDirectoryPlayer[] {
  const dotaId = normalizeDotaAccountId(row.dota_id);
  if (!dotaId) return [];
  return [
    {
      kind: "registered",
      identityId: row.identity_id,
      discordId: row.discord_id,
      dotaId,
      nickname: row.nickname,
      aliases: row.aliases,
      avatarUrl: row.avatar_url,
      positions: row.positions,
      primaryRole: roleAt(row.positions, 0),
      secondaryRole: roleAt(row.positions, 1),
      tier: row.tier,
      links: buildPlayerLinks(dotaId),
    },
  ];
}

export async function loadParticipantDirectory(
  includeArchived = false,
): Promise<ParticipantDirectoryPlayer[]> {
  const rows = await query<RegisteredParticipantRow>(
    `SELECT
       identity.id::text AS identity_id,
       player.discord_id::text,
       player.steam_id32::text AS dota_id,
       player.ingame_name AS nickname,
       COALESCE(alias.names, ARRAY[]::text[]) AS aliases,
       COALESCE(
         NULLIF(player.avatar_url, ''),
         NULLIF(latest_session.discord_avatar_url, '')
       ) AS avatar_url,
       player.positions,
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
     JOIN player_identity_members own_member
       ON own_member.player_id = player.discord_id
     JOIN player_identities identity
       ON identity.id = own_member.identity_id
      AND identity.registered_player_id = player.discord_id
     LEFT JOIN LATERAL (
       SELECT ARRAY_AGG(
         DISTINCT member.nickname_snapshot
         ORDER BY member.nickname_snapshot
       ) FILTER (
         WHERE LOWER(member.nickname_snapshot) <> LOWER(player.ingame_name)
       ) AS names
       FROM player_identity_members member
       WHERE member.identity_id = identity.id
     ) alias ON TRUE
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
     WHERE player.is_archived = FALSE
       AND player.steam_id32 BETWEEN 1 AND 4294967295
     ORDER BY LOWER(player.ingame_name), player.discord_id`,
  );
  const registered = rows.flatMap(registeredParticipant);
  if (!includeArchived) return registered;

  const archiveRows = await query<ArchiveParticipantRow>(
    `SELECT
       identity.id::text AS identity_id,
       identity.primary_nickname AS nickname,
       ARRAY_AGG(
         DISTINCT member.nickname_snapshot
         ORDER BY member.nickname_snapshot
       ) AS aliases,
       MAX(
         COALESCE(
           NULLIF(player.internal_rating, 0),
           CASE
             WHEN player.rank_tier >= 10 THEN player.rank_tier / 10
             WHEN player.rank_tier > 0 THEN player.rank_tier
             ELSE NULL
           END
         )
       )::int AS tier
     FROM player_identities identity
     JOIN player_identity_members member ON member.identity_id = identity.id
     JOIN players player ON player.discord_id = member.player_id
     WHERE identity.registered_player_id IS NULL
     GROUP BY identity.id, identity.primary_nickname
     ORDER BY LOWER(identity.primary_nickname), identity.id`,
  );
  return [
    ...registered,
    ...archiveRows.map((row): ParticipantDirectoryPlayer => ({
      kind: "archive",
      identityId: row.identity_id,
      discordId: null,
      dotaId: null,
      nickname: row.nickname,
      aliases: row.aliases,
      avatarUrl: null,
      positions: null,
      primaryRole: null,
      secondaryRole: null,
      tier: row.tier,
      links: null,
    })),
  ];
}
