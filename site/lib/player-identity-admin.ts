import type { PoolClient } from "pg";
import { transaction } from "./db";
import { normalizeParticipantTierInput } from "./player-tier-status";

export {
  loadArchiveIdentityProfile,
  type ArchiveIdentityProfile,
} from "./archive-identity-profile";

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
  tier: number | string,
  actorDiscordId: string,
) {
  const normalizedTier = normalizeParticipantTierInput(tier);
  if (!normalizedTier) {
    throw new Response("Тир должен быть от 0 до 12", { status: 400 });
  }
  const { isOutdated, numericTier } = normalizedTier;
  return transaction(async (client) => {
    const updated = await client.query<{
      nickname: string;
      tier_status: "current" | "outdated" | "inactive";
    }>(
      `UPDATE players
       SET internal_rating = CASE WHEN $2 THEN internal_rating ELSE $3 END,
           tier_status = CASE
             WHEN tier_status = 'inactive' THEN 'inactive'
             WHEN $2 THEN 'outdated'
             ELSE 'current'
           END,
           last_updated = NOW()
       WHERE discord_id = $1
         AND is_archived = FALSE
       RETURNING ingame_name AS nickname, tier_status`,
      [playerId, isOutdated, numericTier],
    );
    if (!updated.rows[0]) {
      throw new Response("Действующий участник не найден", { status: 404 });
    }
    await audit(client, actorDiscordId, "player_tier_update", playerId, {
      tier: isOutdated ? "!" : numericTier,
      tierStatus: updated.rows[0].tier_status,
    });
    return {
      nickname: updated.rows[0].nickname,
      tier: isOutdated ? null : numericTier,
      tierStatus: updated.rows[0].tier_status,
    };
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
  expectedIdentityId?: string,
) {
  if (!/^-?\d+$/.test(archivePlayerId.trim())) {
    throw new Response("Архивный профиль не найден", { status: 404 });
  }
  const normalizedIdentityId = expectedIdentityId?.trim() || null;
  if (normalizedIdentityId && !/^\d+$/.test(normalizedIdentityId)) {
    throw new Response("Архивный профиль не найден", { status: 404 });
  }
  return transaction(async (client) => {
    const linked = await client.query<{
      identity_id: string;
      nickname: string;
      is_registered_identity: boolean;
      member_count: number;
    }>(
      `SELECT
         member.identity_id::text,
         COALESCE(
           NULLIF(BTRIM(member.nickname_snapshot), ''),
           archived.ingame_name
         ) AS nickname,
         identity.registered_player_id IS NOT NULL AS is_registered_identity,
         (
           SELECT COUNT(*)::int
           FROM player_identity_members identity_member
           WHERE identity_member.identity_id = identity.id
         ) AS member_count
       FROM players archived
       JOIN player_identity_members member
         ON member.player_id = archived.discord_id
       JOIN player_identities identity
         ON identity.id = member.identity_id
       WHERE archived.discord_id = $1
         AND archived.is_archived = TRUE
         AND ($2::bigint IS NULL OR identity.id = $2::bigint)
       FOR UPDATE OF archived, member, identity`,
      [archivePlayerId, normalizedIdentityId],
    );
    if (!linked.rows[0]) {
      throw new Response("Связанный архивный профиль не найден", {
        status: 404,
      });
    }
    if (
      !linked.rows[0].is_registered_identity &&
      linked.rows[0].member_count <= 1
    ) {
      throw new Response("Этот архивный профиль уже отделён", { status: 400 });
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
       SET primary_nickname = CASE
             WHEN EXISTS (
               SELECT 1
               FROM player_identity_members remaining_member
               WHERE remaining_member.identity_id = $1
                 AND LOWER(BTRIM(remaining_member.nickname_snapshot)) =
                     LOWER(BTRIM(player_identities.primary_nickname))
             ) THEN primary_nickname
             ELSE (
               SELECT remaining_member.nickname_snapshot
               FROM player_identity_members remaining_member
               WHERE remaining_member.identity_id = $1
               ORDER BY remaining_member.player_id
               LIMIT 1
             )
           END,
           updated_at = NOW()
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
