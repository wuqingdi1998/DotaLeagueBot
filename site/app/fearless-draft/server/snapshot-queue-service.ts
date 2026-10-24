import type { PoolClient } from "pg";
import type { DraftFormat } from "../model/types";
import type { DraftInvitationSnapshot, WaitingDraftPlayer } from "../model/snapshot";
import { DRAFT_QUEUE_TTL_SECONDS } from "../model/config";
import { loadPlayers, playerFromRow, type PlayerRow } from "./snapshot-players";

type InvitationRow = {
  id: number;
  sender_id: string;
  recipient_id: string;
  format: DraftFormat;
  expires_at: Date;
};

export async function loadDraftQueueSnapshot(client: PoolClient, playerId: string) {
    await client.query(
      `DELETE FROM draft_queue
       WHERE heartbeat_at < NOW() - ($1::int * INTERVAL '1 second')`,
      [DRAFT_QUEUE_TTL_SECONDS],
    );
    const ownQueue = await client.query(
      `UPDATE draft_queue SET heartbeat_at = NOW()
       WHERE player_id = $1 RETURNING player_id`,
      [playerId],
    );
    const isWaiting = Boolean(ownQueue.rowCount);
    const waitingRows = await client.query<PlayerRow & { joined_at: Date }>(
      `SELECT player.discord_id::text AS id, player.ingame_name AS name,
              COALESCE(latest.discord_username, player.ingame_name) AS discord_name,
              COALESCE(
                NULLIF(player.avatar_url, ''),
                NULLIF(latest.discord_avatar_url, '')
              ) AS avatar_url,
              queue.joined_at
       FROM draft_queue queue
       JOIN players player ON player.discord_id = queue.player_id
       LEFT JOIN LATERAL (
         SELECT session.discord_username, session.discord_avatar_url
         FROM web_sessions session WHERE session.discord_id = player.discord_id
         ORDER BY session.created_at DESC LIMIT 1
       ) latest ON TRUE
       WHERE queue.player_id <> $1
       ORDER BY queue.joined_at`,
      [playerId],
    );
    const invitationRows = await client.query<InvitationRow>(
      `SELECT id::int, sender_id::text, recipient_id::text, format, expires_at
       FROM draft_invitations
       WHERE status = 'PENDING' AND (sender_id = $1 OR recipient_id = $1)
       ORDER BY created_at DESC`,
      [playerId],
    );
    const opponentIds = invitationRows.rows.map((row) =>
      row.sender_id === playerId ? row.recipient_id : row.sender_id,
    );
    const opponents = await loadPlayers(client, opponentIds);
    const invitations: DraftInvitationSnapshot[] = invitationRows.rows.flatMap((row) => {
      const opponentId = row.sender_id === playerId
        ? row.recipient_id
        : row.sender_id;
      const opponent = opponents.get(opponentId);
      if (!opponent) return [];
      return [{
        id: row.id,
        direction: row.sender_id === playerId ? "OUTGOING" : "INCOMING",
        format: row.format,
        opponent,
        expiresAt: row.expires_at.toISOString(),
      }];
    });
    const waitingPlayers: WaitingDraftPlayer[] = waitingRows.rows.map((row) => ({
      ...playerFromRow(row),
      joinedAt: row.joined_at.toISOString(),
    }));
    return { isWaiting, invitations, waitingPlayers };
}
