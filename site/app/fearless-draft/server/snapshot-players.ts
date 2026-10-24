import type { AuthUser } from "@/lib/auth";
import type { PoolClient } from "pg";
import type { DraftPlayer, DraftLobbyPlayer } from "../model/snapshot";
import { SEASON_LOBBY_PRESENCE_TTL_SECONDS } from "@/lib/season-lobby-room";
import { playerServerName } from "@/lib/security";

export type PlayerRow = {
  id: string;
  name: string;
  discord_name: string;
  avatar_url: string | null;
};

export function playerFromAuth(user: AuthUser): DraftPlayer {
  return {
    id: user.discordId,
    name: user.serverName,
    discordName: user.username,
    avatarUrl: user.avatarUrl,
  };
}

export function playerFromRow(row: PlayerRow): DraftPlayer {
  return {
    id: row.id,
    name: row.name,
    discordName: row.discord_name,
    avatarUrl: row.avatar_url,
  };
}

export async function loadPlayers(
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

export async function loadSeasonLobbyPlayers(
  client: PoolClient,
  matchId: number,
): Promise<DraftLobbyPlayer[]> {
  const result = await client.query<{
    id: string;
    dota_id: string;
    name: string;
    real_name: string | null;
    positions: string | null;
    avatar_url: string | null;
    team_side: "a" | "b";
    slot_number: number | null;
    is_captain: boolean;
    is_online: boolean;
  }>(
    `SELECT room_player.player_id::text AS id,
            player.steam_id32::text AS dota_id,
            player.ingame_name AS name,
            player.real_name,
            player.positions,
            player.avatar_url,
            room_player.team_side,
            room_player.slot_number::int,
            room_player.player_id IN (
              room.team_a_captain_id, room.team_b_captain_id
            ) AS is_captain,
            presence.heartbeat_at >= NOW()
              - ($2::int * INTERVAL '1 second') AS is_online
     FROM season_match_room_players room_player
     JOIN season_match_rooms room ON room.match_id = room_player.match_id
     JOIN players player ON player.discord_id = room_player.player_id
     LEFT JOIN season_match_room_presence presence
       ON presence.match_id = room_player.match_id
      AND presence.player_id = room_player.player_id
     WHERE room_player.match_id = $1
     ORDER BY room_player.team_side,
       is_captain DESC, room_player.slot_number NULLS LAST, room_player.player_id`,
    [matchId, SEASON_LOBBY_PRESENCE_TTL_SECONDS],
  );
  return result.rows.map((row) => ({
    id: row.id,
    dotaId: row.dota_id,
    name: row.name,
    serverName: playerServerName(row.real_name, row.name, row.positions),
    avatarUrl: row.avatar_url,
    teamSide: row.team_side,
    isOnline: row.is_online,
    slotNumber: row.slot_number,
    isCaptain: row.is_captain,
  }));
}
