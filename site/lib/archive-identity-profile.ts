import { one, query } from "./db";

export type ArchiveIdentityProfile = {
  id: string;
  primaryNickname: string;
  aliases: string[];
  members: Array<{
    playerId: string;
    nickname: string;
  }>;
  tournaments: Array<{
    slug: string;
    name: string;
    nickname: string;
  }>;
  registeredCandidates: Array<{
    discordId: string;
    dotaId: string;
    nickname: string;
  }>;
  archiveCandidates: Array<{
    id: string;
    nickname: string;
    aliases: string[];
  }>;
};

export async function loadArchiveIdentityProfile(
  identityId: string,
): Promise<ArchiveIdentityProfile | null> {
  if (!/^\d+$/.test(identityId)) return null;
  const identity = await one<{
    id: string;
    primary_nickname: string;
    aliases: string[];
    members: Array<{ playerId: string; nickname: string }>;
  }>(
    `SELECT
       identity.id::text,
       identity.primary_nickname,
       ARRAY_AGG(
         DISTINCT member.nickname_snapshot
         ORDER BY member.nickname_snapshot
       ) AS aliases,
       JSON_AGG(
         JSON_BUILD_OBJECT(
           'playerId', member.player_id::text,
           'nickname', member.nickname_snapshot
         )
         ORDER BY member.nickname_snapshot, member.player_id
       ) AS members
     FROM player_identities identity
     JOIN player_identity_members member ON member.identity_id = identity.id
     WHERE identity.id = $1
       AND identity.registered_player_id IS NULL
     GROUP BY identity.id, identity.primary_nickname`,
    [identityId],
  );
  if (!identity) return null;

  const [tournaments, registeredCandidates, archiveCandidates] =
    await Promise.all([
      query<{ slug: string; name: string; nickname: string }>(
        `SELECT DISTINCT history.slug, history.name, history.nickname
         FROM (
           SELECT
             tournament.slug,
             tournament.name,
             COALESCE(
               NULLIF(BTRIM(participant.nickname_snapshot), ''),
               member.nickname_snapshot
             ) AS nickname
           FROM player_identity_members member
           JOIN season_match_participants participant
             ON participant.player_id = member.player_id
           JOIN season_matches match ON match.id = participant.match_id
           JOIN season_lobbies lobby ON lobby.id = match.lobby_id
           JOIN season_rounds round ON round.id = lobby.round_id
           JOIN tournaments tournament ON tournament.id = round.tournament_id
           WHERE member.identity_id = $1

           UNION

           SELECT
             tournament.slug,
             tournament.name,
             COALESCE(
               NULLIF(BTRIM(snapshot.nickname_snapshot), ''),
               member.nickname_snapshot
             ) AS nickname
           FROM player_identity_members member
           JOIN tournament_roster_snapshots snapshot
             ON snapshot.player_id = member.player_id
           JOIN tournament_team_applications application
             ON application.id = snapshot.application_id
           JOIN tournaments tournament ON tournament.id = application.tournament_id
           WHERE member.identity_id = $1
         ) history
         ORDER BY history.name, history.nickname`,
        [identityId],
      ),
      query<{ discord_id: string; dota_id: string; nickname: string }>(
        `SELECT
           discord_id::text,
           steam_id32::text AS dota_id,
           ingame_name AS nickname
         FROM players
         WHERE is_archived = FALSE
           AND steam_id32 BETWEEN 1 AND 4294967295
         ORDER BY LOWER(ingame_name), discord_id`,
      ),
      query<{ id: string; nickname: string; aliases: string[] }>(
        `SELECT
           identity.id::text,
           identity.primary_nickname AS nickname,
           ARRAY_AGG(
             DISTINCT member.nickname_snapshot
             ORDER BY member.nickname_snapshot
           ) AS aliases
         FROM player_identities identity
         JOIN player_identity_members member ON member.identity_id = identity.id
         WHERE identity.registered_player_id IS NULL
           AND identity.id <> $1
         GROUP BY identity.id, identity.primary_nickname
         ORDER BY LOWER(identity.primary_nickname), identity.id`,
        [identityId],
      ),
    ]);
  return {
    id: identity.id,
    primaryNickname: identity.primary_nickname,
    aliases: identity.aliases,
    members: identity.members,
    tournaments,
    registeredCandidates: registeredCandidates.map((candidate) => ({
      discordId: candidate.discord_id,
      dotaId: candidate.dota_id,
      nickname: candidate.nickname,
    })),
    archiveCandidates,
  };
}
