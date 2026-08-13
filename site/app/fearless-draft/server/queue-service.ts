import { transaction } from "@/lib/db";
import {
  DRAFT_INVITATION_TTL_MINUTES,
  DRAFT_QUEUE_TTL_SECONDS,
} from "../model/config";
import type { DraftFormat } from "../model/types";
import { DraftRequestError } from "./errors";
import { hasActiveSeries, lockDraftPlayers } from "./database";
import { randomCoinTossResult } from "./coin-toss";

const formats: DraftFormat[] = ["BO2", "BO3"];

async function expireTransientRecords(client: Parameters<Parameters<typeof transaction>[0]>[0]) {
  await client.query(
    `UPDATE draft_invitations
     SET status = 'EXPIRED', responded_at = NOW()
     WHERE status = 'PENDING' AND expires_at <= NOW()`,
  );
  await client.query(
    `DELETE FROM draft_queue
     WHERE heartbeat_at < NOW() - ($1::int * INTERVAL '1 second')`,
    [DRAFT_QUEUE_TTL_SECONDS],
  );
}

export async function joinDraftQueue(playerId: string): Promise<void> {
  await transaction(async (client) => {
    await lockDraftPlayers(client, [playerId]);
    await expireTransientRecords(client);
    if (await hasActiveSeries(client, playerId)) {
      throw new DraftRequestError("Сначала завершите активный Fearless Draft", 409);
    }
    await client.query(
      `INSERT INTO draft_queue(player_id)
       VALUES ($1)
       ON CONFLICT (player_id) DO UPDATE SET heartbeat_at = NOW()`,
      [playerId],
    );
  });
}

export async function leaveDraftQueue(playerId: string): Promise<void> {
  await transaction(async (client) => {
    await lockDraftPlayers(client, [playerId]);
    await client.query("DELETE FROM draft_queue WHERE player_id = $1", [playerId]);
    await client.query(
      `UPDATE draft_invitations
       SET status = 'CANCELLED', responded_at = NOW()
       WHERE status = 'PENDING' AND (sender_id = $1 OR recipient_id = $1)`,
      [playerId],
    );
  });
}

export async function sendDraftInvitation(
  senderId: string,
  recipientId: string,
  format: DraftFormat,
): Promise<void> {
  if (senderId === recipientId) {
    throw new DraftRequestError("Нельзя пригласить самого себя");
  }
  if (!/^\d{5,20}$/.test(recipientId) || !formats.includes(format)) {
    throw new DraftRequestError("Некорректное приглашение");
  }
  await transaction(async (client) => {
    await lockDraftPlayers(client, [senderId, recipientId]);
    await expireTransientRecords(client);
    if (
      (await hasActiveSeries(client, senderId)) ||
      (await hasActiveSeries(client, recipientId))
    ) {
      throw new DraftRequestError("Один из участников уже начал другой драфт", 409);
    }
    const waiting = await client.query(
      `SELECT player_id
       FROM draft_queue
       WHERE player_id = ANY($1::bigint[])
         AND heartbeat_at >= NOW() - ($2::int * INTERVAL '1 second')`,
      [[senderId, recipientId], DRAFT_QUEUE_TTL_SECONDS],
    );
    if (waiting.rowCount !== 2) {
      throw new DraftRequestError("Соперник уже покинул поиск", 409);
    }
    const duplicate = await client.query(
      `SELECT 1 FROM draft_invitations
       WHERE status = 'PENDING'
         AND ((sender_id = $1 AND recipient_id = $2)
           OR (sender_id = $2 AND recipient_id = $1))
       LIMIT 1`,
      [senderId, recipientId],
    );
    if (duplicate.rowCount) {
      throw new DraftRequestError("Между вами уже есть активное приглашение", 409);
    }
    await client.query(
      `INSERT INTO draft_invitations
        (sender_id, recipient_id, format, expires_at)
       VALUES ($1, $2, $3, NOW() + ($4::int * INTERVAL '1 minute'))`,
      [senderId, recipientId, format, DRAFT_INVITATION_TTL_MINUTES],
    );
  });
}

export async function respondToDraftInvitation(
  playerId: string,
  invitationId: number,
  response: "ACCEPTED" | "DECLINED" | "CANCELLED",
): Promise<number | null> {
  if (!Number.isInteger(invitationId) || invitationId <= 0) {
    throw new DraftRequestError("Приглашение не найдено", 404);
  }
  return transaction(async (client) => {
    await expireTransientRecords(client);
    const invitationResult = await client.query<{
      sender_id: string;
      recipient_id: string;
      format: DraftFormat;
      status: string;
    }>(
      `SELECT sender_id::text, recipient_id::text, format, status
       FROM draft_invitations WHERE id = $1 FOR UPDATE`,
      [invitationId],
    );
    const invitation = invitationResult.rows[0];
    if (!invitation || invitation.status !== "PENDING") {
      throw new DraftRequestError("Приглашение уже недоступно", 409);
    }
    const expectedPlayerId = response === "CANCELLED"
      ? invitation.sender_id
      : invitation.recipient_id;
    if (expectedPlayerId !== playerId) {
      throw new DraftRequestError("Это приглашение адресовано другому пользователю", 403);
    }
    await lockDraftPlayers(client, [invitation.sender_id, invitation.recipient_id]);

    if (response !== "ACCEPTED") {
      await client.query(
        `UPDATE draft_invitations
         SET status = $1, responded_at = NOW()
         WHERE id = $2 AND status = 'PENDING'`,
        [response, invitationId],
      );
      return null;
    }
    if (
      (await hasActiveSeries(client, invitation.sender_id)) ||
      (await hasActiveSeries(client, invitation.recipient_id))
    ) {
      throw new DraftRequestError("Один из участников уже начал другой драфт", 409);
    }
    const queueRows = await client.query(
      `SELECT player_id FROM draft_queue
       WHERE player_id = ANY($1::bigint[])
         AND heartbeat_at >= NOW() - ($2::int * INTERVAL '1 second')`,
      [[invitation.sender_id, invitation.recipient_id], DRAFT_QUEUE_TTL_SECONDS],
    );
    if (queueRows.rowCount !== 2) {
      throw new DraftRequestError("Один из участников уже покинул поиск", 409);
    }

    const players = [invitation.sender_id, invitation.recipient_id] as const;
    const coinToss = randomCoinTossResult(players);
    const seriesResult = await client.query<{ id: number }>(
      `INSERT INTO draft_series
        (player1_id, player2_id, format, map1_coin_toss_winner_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id::int`,
      [invitation.sender_id, invitation.recipient_id, invitation.format, coinToss.winnerId],
    );
    const seriesId = seriesResult.rows[0].id;
    await client.query(
      `UPDATE draft_series
       SET player1_dismissed_at = CASE
             WHEN player1_id = ANY($1::bigint[]) THEN NOW() ELSE player1_dismissed_at END,
           player2_dismissed_at = CASE
             WHEN player2_id = ANY($1::bigint[]) THEN NOW() ELSE player2_dismissed_at END
       WHERE status = 'COMPLETE'
         AND (player1_id = ANY($1::bigint[]) OR player2_id = ANY($1::bigint[]))`,
      [players],
    );
    await client.query(
      `INSERT INTO draft_maps
        (series_id, map_number, coin_toss_winner_id, coin_toss_segment, first_chooser_id)
       VALUES ($1, 1, $2, $3, $2)`,
      [seriesId, coinToss.winnerId, coinToss.segment],
    );
    await client.query(
      `UPDATE draft_invitations
       SET status = CASE WHEN id = $1 THEN 'ACCEPTED' ELSE 'CANCELLED' END,
           responded_at = NOW()
       WHERE status = 'PENDING'
         AND (sender_id = ANY($2::bigint[]) OR recipient_id = ANY($2::bigint[]))`,
      [invitationId, players],
    );
    await client.query("DELETE FROM draft_queue WHERE player_id = ANY($1::bigint[])", [players]);
    return seriesId;
  });
}
