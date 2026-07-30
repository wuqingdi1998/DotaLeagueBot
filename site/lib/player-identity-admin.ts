import type { PoolClient } from "pg";
import { one, query, transaction } from "./db";

export type ArchiveIdentityProfile = {
  id: string;
  primaryNickname: string;
  aliases: string[];
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

async function audit(
  client: PoolClient,
  actorDiscordId: string,
  action: string,
  entityId: string,
  details: Record<string, unknown>,
) {
  await client.query(
    `INSERT INTO tournament_audit_log(
       actor_discord_id,
       action,
       entity_type,
       entity_id,
       details
     ) VALUES ($1, $2, 'player_identity', $3, $4::jsonb)`,
    [actorDiscordId, action, entityId, JSON.stringify(details)],
  );
}

export async function updateParticipantTier(
  playerId: string,
  tier: number,
  actorDiscordId: string,
) {
  if (!Number.isInteger(tier) || tier < 0 || tier > 12) {
    throw new Response("Тир должен быть от 0 до 12", { status: 400 });
  }
  return transaction(async (client) => {
    const updated = await client.query<{ nickname: string }>(
      `UPDATE players
       SET internal_rating = $2,
           last_updated = NOW()
       WHERE discord_id = $1
         AND is_archived = FALSE
       RETURNING ingame_name AS nickname`,
      [playerId, tier],
    );
    if (!updated.rows[0]) {
      throw new Response("Действующий участник не найден", { status: 404 });
    }
    await audit(client, actorDiscordId, "player_tier_update", playerId, {
      tier,
    });
    return { nickname: updated.rows[0].nickname, tier };
  });
}

export async function archiveParticipant(
  playerId: string,
  actorDiscordId: string,
) {
  if (playerId === actorDiscordId) {
    throw new Response(
      "Нельзя перенести в архив собственный профиль организатора",
      { status: 400 },
    );
  }
  return transaction(async (client) => {
    const target = await client.query<{
      nickname: string;
      identity_id: string;
    }>(
      `SELECT
         player.ingame_name AS nickname,
         member.identity_id::text
       FROM players player
       JOIN player_identity_members member
         ON member.player_id = player.discord_id
       WHERE player.discord_id = $1
         AND player.is_archived = FALSE
       FOR UPDATE OF player`,
      [playerId],
    );
    if (!target.rows[0]) {
      throw new Response("Действующий участник не найден", { status: 404 });
    }
    const { nickname, identity_id: identityId } = target.rows[0];
    await client.query(
      `UPDATE players
       SET is_archived = TRUE,
           archived_at = NOW(),
           archived_by = $2
       WHERE discord_id = $1`,
      [playerId, actorDiscordId],
    );
    await client.query(
      `UPDATE player_identities
       SET registered_player_id = NULL,
           primary_nickname = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [identityId, nickname],
    );
    await client.query("DELETE FROM web_sessions WHERE discord_id = $1", [
      playerId,
    ]);
    await client.query(
      "DELETE FROM web_organizer_sessions WHERE discord_id = $1",
      [playerId],
    );
    await audit(client, actorDiscordId, "player_archived", identityId, {
      playerId,
      nickname,
    });
    return { identityId, nickname };
  });
}

async function archiveIdentity(
  client: PoolClient,
  identityId: string,
  lock = false,
) {
  const result = await client.query<{ primary_nickname: string }>(
    `SELECT primary_nickname
     FROM player_identities
     WHERE id = $1
       AND registered_player_id IS NULL
     ${lock ? "FOR UPDATE" : ""}`,
    [identityId],
  );
  if (!result.rows[0]) {
    throw new Response("Архивный профиль не найден", { status: 404 });
  }
  return result.rows[0];
}

async function nicknameBelongsToIdentity(
  client: PoolClient,
  identityId: string,
  nickname: string,
) {
  const result = await client.query(
    `SELECT 1
     FROM player_identity_members
     WHERE identity_id = $1
       AND LOWER(nickname_snapshot) = LOWER($2)`,
    [identityId, nickname],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function renameArchiveIdentity(
  identityId: string,
  nickname: string,
  actorDiscordId: string,
) {
  const normalized = nickname.trim();
  if (!normalized || normalized.length > 100) {
    throw new Response("Выберите корректный основной ник", { status: 400 });
  }
  return transaction(async (client) => {
    await archiveIdentity(client, identityId, true);
    if (!(await nicknameBelongsToIdentity(client, identityId, normalized))) {
      throw new Response("Ник не входит в этот архивный профиль", {
        status: 400,
      });
    }
    await client.query(
      `UPDATE player_identities
       SET primary_nickname = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [identityId, normalized],
    );
    await audit(client, actorDiscordId, "archive_primary_nickname", identityId, {
      nickname: normalized,
    });
    return { identityId, nickname: normalized };
  });
}

export async function mergeArchiveIdentities(
  targetIdentityId: string,
  sourceIdentityId: string,
  actorDiscordId: string,
) {
  if (targetIdentityId === sourceIdentityId) {
    throw new Response("Выберите другой архивный профиль", { status: 400 });
  }
  return transaction(async (client) => {
    await archiveIdentity(client, targetIdentityId, true);
    const source = await archiveIdentity(client, sourceIdentityId, true);
    await client.query(
      `UPDATE player_identity_members
       SET identity_id = $1
       WHERE identity_id = $2`,
      [targetIdentityId, sourceIdentityId],
    );
    await client.query("DELETE FROM player_identities WHERE id = $1", [
      sourceIdentityId,
    ]);
    await client.query(
      `UPDATE player_identities
       SET updated_at = NOW()
       WHERE id = $1`,
      [targetIdentityId],
    );
    await audit(
      client,
      actorDiscordId,
      "archive_identity_merge",
      targetIdentityId,
      {
        sourceIdentityId,
        sourceNickname: source.primary_nickname,
      },
    );
    return { identityId: targetIdentityId };
  });
}

export async function linkArchiveIdentity(
  archiveIdentityId: string,
  requestedPlayerId: string,
  actorDiscordId: string,
) {
  return transaction(async (client) => {
    await archiveIdentity(client, archiveIdentityId, true);
    const target = await client.query<{
      identity_id: string;
      nickname: string;
    }>(
      `SELECT
         member.identity_id::text,
         player.ingame_name AS nickname
       FROM players player
       JOIN player_identity_members member
         ON member.player_id = player.discord_id
       WHERE (
         player.discord_id::text = $1
         OR player.steam_id32::text = $1
       )
         AND player.is_archived = FALSE
       ORDER BY (player.discord_id::text = $1) DESC
       LIMIT 1
       FOR UPDATE OF player`,
      [requestedPlayerId.trim()],
    );
    if (!target.rows[0]) {
      throw new Response("Зарегистрированный участник не найден", {
        status: 404,
      });
    }
    const targetIdentityId = target.rows[0].identity_id;
    if (targetIdentityId === archiveIdentityId) {
      throw new Response("Профиль уже связан с этим участником", {
        status: 400,
      });
    }
    await client.query(
      `UPDATE player_identity_members
       SET identity_id = $1
       WHERE identity_id = $2`,
      [targetIdentityId, archiveIdentityId],
    );
    await client.query("DELETE FROM player_identities WHERE id = $1", [
      archiveIdentityId,
    ]);
    await audit(client, actorDiscordId, "archive_identity_link", targetIdentityId, {
      archiveIdentityId,
      playerId: requestedPlayerId,
      nickname: target.rows[0].nickname,
    });
    return {
      identityId: targetIdentityId,
      nickname: target.rows[0].nickname,
    };
  });
}

export async function unlinkArchiveProfile(
  archivePlayerId: string,
  actorDiscordId: string,
) {
  if (!/^-?\d+$/.test(archivePlayerId.trim())) {
    throw new Response("Архивный профиль не найден", { status: 404 });
  }
  return transaction(async (client) => {
    const linked = await client.query<{
      identity_id: string;
      nickname: string;
    }>(
      `SELECT
         member.identity_id::text,
         archived.ingame_name AS nickname
       FROM players archived
       JOIN player_identity_members member
         ON member.player_id = archived.discord_id
       JOIN player_identities identity
         ON identity.id = member.identity_id
       WHERE archived.discord_id = $1
         AND archived.is_archived = TRUE
         AND identity.registered_player_id IS NOT NULL
       FOR UPDATE OF archived, member, identity`,
      [archivePlayerId],
    );
    if (!linked.rows[0]) {
      throw new Response("Связанный архивный профиль не найден", {
        status: 404,
      });
    }

    const previousIdentityId = linked.rows[0].identity_id;
    const created = await client.query<{ id: string }>(
      `INSERT INTO player_identities(primary_nickname, registered_player_id)
       VALUES ($1, NULL)
       RETURNING id::text`,
      [linked.rows[0].nickname],
    );
    const identityId = created.rows[0].id;
    await client.query(
      `UPDATE player_identity_members
       SET identity_id = $1
       WHERE player_id = $2
         AND identity_id = $3`,
      [identityId, archivePlayerId, previousIdentityId],
    );
    await client.query(
      `UPDATE player_identities
       SET updated_at = NOW()
       WHERE id = $1`,
      [previousIdentityId],
    );
    await audit(
      client,
      actorDiscordId,
      "archive_identity_unlink",
      identityId,
      {
        archivePlayerId,
        previousIdentityId,
        nickname: linked.rows[0].nickname,
      },
    );
    return { identityId, nickname: linked.rows[0].nickname };
  });
}

export async function loadArchiveIdentityProfile(
  identityId: string,
): Promise<ArchiveIdentityProfile | null> {
  if (!/^\d+$/.test(identityId)) return null;
  const identity = await one<{
    id: string;
    primary_nickname: string;
    aliases: string[];
  }>(
    `SELECT
       identity.id::text,
       identity.primary_nickname,
       ARRAY_AGG(
         DISTINCT member.nickname_snapshot
         ORDER BY member.nickname_snapshot
       ) AS aliases
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
             participant.nickname_snapshot AS nickname
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
             snapshot.nickname_snapshot AS nickname
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
    tournaments,
    registeredCandidates: registeredCandidates.map((candidate) => ({
      discordId: candidate.discord_id,
      dotaId: candidate.dota_id,
      nickname: candidate.nickname,
    })),
    archiveCandidates,
  };
}
