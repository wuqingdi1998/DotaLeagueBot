import type { AuthUser } from "@/lib/auth";
import type { PoolClient } from "pg";
import { transaction } from "@/lib/db";
import {
  DRAFT_QUEUE_TTL_SECONDS,
  DRAFT_SEQUENCE,
} from "../model/config";
import type {
  DraftActionSnapshot,
  DraftInvitationSnapshot,
  DraftMapSnapshot,
  DraftPlayer,
  DraftSeriesSnapshot,
  FearlessDraftSnapshot,
  WaitingDraftPlayer,
} from "../model/snapshot";
import type { DraftChoice, DraftFormat } from "../model/types";
import { settleExpiredDraft } from "./series-service";
import { advanceBotDraft } from "./bot-service";
import { settleExpiredDraftEndRequests } from "./agreement-service";
import { draftEndRequestExpiresAt } from "../model/agreement";
import { databaseNow } from "./database-clock";
import { FEARLESS_DRAFT_BOT_PLAYER_ID } from "../model/bot";

type PlayerRow = {
  id: string;
  name: string;
  discord_name: string;
  avatar_url: string | null;
};

type InvitationRow = {
  id: number;
  sender_id: string;
  recipient_id: string;
  format: DraftFormat;
  expires_at: Date;
};

type SeriesRow = {
  id: number;
  player1_id: string;
  player2_id: string;
  format: DraftFormat;
  status: DraftSeriesSnapshot["status"];
  current_map: number;
  map1_coin_toss_winner_id: string;
  end_requested_by: string | null;
  end_requested_at: Date | null;
  player1_ready_for_next_map: boolean;
  player2_ready_for_next_map: boolean;
  created_at: Date;
  updated_at: Date;
};

type MapRow = {
  id: number;
  map_number: number;
  status: DraftMapSnapshot["status"];
  coin_toss_winner_id: string | null;
  coin_toss_segment: number | null;
  first_chooser_id: string;
  first_choice: DraftChoice | null;
  second_choice: DraftChoice | null;
  radiant_player_id: string | null;
  first_pick_player_id: string | null;
  current_step: number;
  step_started_at: Date | null;
  player1_reserve_seconds: number;
  player2_reserve_seconds: number;
  version: number;
  created_at: Date;
};

function playerFromAuth(user: AuthUser): DraftPlayer {
  return {
    id: user.discordId,
    name: user.serverName,
    discordName: user.username,
    avatarUrl: user.avatarUrl,
  };
}

function playerFromRow(row: PlayerRow): DraftPlayer {
  return {
    id: row.id,
    name: row.name,
    discordName: row.discord_name,
    avatarUrl: row.avatar_url,
  };
}

async function loadPlayers(
  client: PoolClient,
  playerIds: string[],
): Promise<Map<string, DraftPlayer>> {
  if (!playerIds.length) return new Map();
  const result = await client.query<PlayerRow>(
    `SELECT player.discord_id::text AS id,
            player.ingame_name AS name,
            COALESCE(latest.discord_username, player.ingame_name) AS discord_name,
            COALESCE(
              NULLIF(player.avatar_url, ''),
              NULLIF(latest.discord_avatar_url, '')
            ) AS avatar_url
     FROM players player
     LEFT JOIN LATERAL (
       SELECT session.discord_username, session.discord_avatar_url
       FROM web_sessions session
       WHERE session.discord_id = player.discord_id
       ORDER BY session.created_at DESC LIMIT 1
     ) latest ON TRUE
     WHERE player.discord_id = ANY($1::bigint[])`,
    [playerIds],
  );
  return new Map(result.rows.map((row) => [row.id, playerFromRow(row)]));
}

async function loadSeries(
  client: PoolClient,
  playerId: string,
  seasonMatchId?: number,
): Promise<DraftSeriesSnapshot | null> {
  const seriesResult = await client.query<SeriesRow>(
    `SELECT id::int, player1_id::text, player2_id::text, format, status,
            current_map::int, map1_coin_toss_winner_id::text,
            end_requested_by::text, end_requested_at,
            player1_ready_for_next_map, player2_ready_for_next_map,
            created_at, updated_at
     FROM draft_series
     WHERE (
       (
         (player1_id = $1 OR player2_id = $1)
         AND (
           status = ANY($2::text[])
           OR (status = 'COMPLETE' AND (
             (player1_id = $1 AND player1_dismissed_at IS NULL)
             OR (player2_id = $1 AND player2_dismissed_at IS NULL)
           ))
         )
       )
       OR (
         $3::bigint IS NOT NULL
         AND season_match_id = $3
         AND status = ANY($4::text[])
         AND EXISTS (
           SELECT 1 FROM season_match_room_players participant
           WHERE participant.match_id = season_match_id
             AND participant.player_id = $1
         )
       )
     )
     ORDER BY CASE WHEN status = 'COMPLETE' THEN 1 ELSE 0 END, updated_at DESC
     LIMIT 1`,
    [
      playerId,
      ["CHOOSING", "DRAFTING", "MAP_COMPLETE"],
      seasonMatchId ?? null,
      ["CHOOSING", "DRAFTING", "MAP_COMPLETE", "COMPLETE"],
    ],
  );
  const series = seriesResult.rows[0];
  if (!series) return null;
  const mapResult = await client.query<MapRow>(
    `SELECT id::int, map_number::int, status, coin_toss_winner_id::text,
            coin_toss_segment::int,
            first_chooser_id::text, first_choice, second_choice,
            radiant_player_id::text, first_pick_player_id::text,
            current_step::int, step_started_at,
            player1_reserve_seconds::float8, player2_reserve_seconds::float8,
            version::int, created_at
     FROM draft_maps WHERE series_id = $1 AND map_number = $2`,
    [series.id, series.current_map],
  );
  const map = mapResult.rows[0];
  if (!map) return null;

  const players = await loadPlayers(
    client,
    [series.player1_id, series.player2_id],
  );
  const actionResult = await client.query<{
      step: number;
      actor_id: string;
      action_type: "PICK" | "BAN";
      hero_id: number | null;
      is_automatic: boolean;
      created_at: Date;
    }>(
      `SELECT step::int, actor_id::text, action_type, hero_id::int,
              is_automatic, created_at
       FROM draft_actions WHERE map_id = $1 ORDER BY step`,
      [map.id],
    );
  const unavailableResult = await client.query<{ hero_id: number }>(
      `SELECT DISTINCT action.hero_id::int
       FROM draft_actions action
       JOIN draft_maps previous_map ON previous_map.id = action.map_id
       WHERE previous_map.series_id = $1 AND previous_map.map_number < $2
         AND action.action_type = 'PICK' AND action.hero_id IS NOT NULL`,
      [series.id, map.map_number],
    );
  const currentStep = DRAFT_SEQUENCE[map.current_step] ?? null;
  const currentActorId = currentStep && map.first_pick_player_id
    ? currentStep.actor === "FIRST"
      ? map.first_pick_player_id
      : map.first_pick_player_id === series.player1_id
        ? series.player2_id
        : series.player1_id
    : null;
  const actions: DraftActionSnapshot[] = actionResult.rows.map((action) => ({
    step: action.step,
    actorId: action.actor_id,
    type: action.action_type,
    heroId: action.hero_id,
    isAutomatic: action.is_automatic,
    createdAt: action.created_at.toISOString(),
  }));

  if ([series.player1_id, series.player2_id].includes(playerId)) {
    await client.query(
      `INSERT INTO draft_presence(player_id, series_id)
       VALUES ($1, $2)
       ON CONFLICT (player_id) DO UPDATE
         SET series_id = EXCLUDED.series_id, heartbeat_at = NOW()`,
      [playerId, series.id],
    );
  }
  const connectedResult = await client.query<{ player_id: string }>(
    `SELECT player_id::text FROM draft_presence
     WHERE series_id = $1
       AND heartbeat_at >= NOW() - ($2::int * INTERVAL '1 second')`,
    [series.id, DRAFT_QUEUE_TTL_SECONDS],
  );
  const connected = new Set(connectedResult.rows.map((row) => row.player_id));
  const player1 = players.get(series.player1_id);
  const player2 = players.get(series.player2_id);
  if (!player1 || !player2) return null;

  return {
    id: series.id,
    format: series.format,
    status: series.status,
    currentMap: series.current_map,
    map1CoinTossWinnerId: series.map1_coin_toss_winner_id,
    player1,
    player2,
    player1Connected:
      series.player1_id === FEARLESS_DRAFT_BOT_PLAYER_ID || connected.has(series.player1_id),
    player2Connected:
      series.player2_id === FEARLESS_DRAFT_BOT_PLAYER_ID || connected.has(series.player2_id),
    player1ReadyForNextMap: series.player1_ready_for_next_map,
    player2ReadyForNextMap: series.player2_ready_for_next_map,
    endRequest: series.end_requested_by && series.end_requested_at
      ? {
          requestedByPlayerId: series.end_requested_by,
          requestedAt: series.end_requested_at.toISOString(),
          expiresAt: draftEndRequestExpiresAt(series.end_requested_at).toISOString(),
        }
      : null,
    map: {
      id: map.id,
      number: map.map_number,
      status: map.status,
      coinTossWinnerId: map.coin_toss_winner_id,
      coinTossSegment: map.coin_toss_segment,
      firstChooserId: map.first_chooser_id,
      firstChoice: map.first_choice,
      secondChoice: map.second_choice,
      radiantPlayerId: map.radiant_player_id,
      firstPickPlayerId: map.first_pick_player_id,
      currentStep: map.current_step,
      version: map.version,
      currentActorId,
      currentAction: currentStep?.type ?? null,
      currentPhase: currentStep?.phase ?? null,
      baseDurationSeconds: currentStep?.baseDurationSeconds ?? null,
      stepStartedAt: map.step_started_at?.toISOString() ?? null,
      player1ReserveSeconds: map.player1_reserve_seconds,
      player2ReserveSeconds: map.player2_reserve_seconds,
      actions,
      unavailableHeroIds: unavailableResult.rows.map((row) => row.hero_id),
      createdAt: map.created_at.toISOString(),
    },
    createdAt: series.created_at.toISOString(),
    updatedAt: series.updated_at.toISOString(),
  };
}

export async function loadFearlessDraftSnapshot(
  user: AuthUser,
  options: { seasonMatchId?: number } = {},
): Promise<FearlessDraftSnapshot> {
  await settleExpiredDraftEndRequests();
  await settleExpiredDraft(user.discordId, options.seasonMatchId);
  await advanceBotDraft(user.discordId);
  return transaction(async (client) => {
    await client.query(
      `UPDATE draft_invitations SET status = 'EXPIRED', responded_at = NOW()
       WHERE status = 'PENDING' AND expires_at <= NOW()`,
    );
    await client.query(
      `DELETE FROM draft_queue
       WHERE heartbeat_at < NOW() - ($1::int * INTERVAL '1 second')`,
      [DRAFT_QUEUE_TTL_SECONDS],
    );
    const ownQueue = await client.query(
      `UPDATE draft_queue SET heartbeat_at = NOW()
       WHERE player_id = $1 RETURNING player_id`,
      [user.discordId],
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
      [user.discordId],
    );
    const invitationRows = await client.query<InvitationRow>(
      `SELECT id::int, sender_id::text, recipient_id::text, format, expires_at
       FROM draft_invitations
       WHERE status = 'PENDING' AND (sender_id = $1 OR recipient_id = $1)
       ORDER BY created_at DESC`,
      [user.discordId],
    );
    const opponentIds = invitationRows.rows.map((row) =>
      row.sender_id === user.discordId ? row.recipient_id : row.sender_id,
    );
    const opponents = await loadPlayers(client, opponentIds);
    const invitations: DraftInvitationSnapshot[] = invitationRows.rows.flatMap((row) => {
      const opponentId = row.sender_id === user.discordId
        ? row.recipient_id
        : row.sender_id;
      const opponent = opponents.get(opponentId);
      if (!opponent) return [];
      return [{
        id: row.id,
        direction: row.sender_id === user.discordId ? "OUTGOING" : "INCOMING",
        format: row.format,
        opponent,
        expiresAt: row.expires_at.toISOString(),
      }];
    });
    const waitingPlayers: WaitingDraftPlayer[] = waitingRows.rows.map((row) => ({
      ...playerFromRow(row),
      joinedAt: row.joined_at.toISOString(),
    }));
    const series = await loadSeries(client, user.discordId, options.seasonMatchId);
    const serverNow = await databaseNow(client);
    return {
      serverNow: serverNow.toISOString(),
      user: playerFromAuth(user),
      isOrganizer: user.isAdmin,
      isWaiting,
      waitingPlayers,
      invitations,
      series,
    };
  });
}
