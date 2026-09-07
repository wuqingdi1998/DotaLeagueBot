import type { PoolClient } from "pg";
import { SEASON_LOBBY_PRESENCE_TTL_SECONDS } from "@/lib/season-lobby-room";
import type { SeasonLobbyRoomStatus } from "../model/types";
import { SeasonLobbyRoomError } from "./errors";

export type RoomActor = {
  discordId: string;
  isAdmin: boolean;
};

export type LockedRoom = {
  status: SeasonLobbyRoomStatus;
  host_player_id: string | null;
  best_of: number;
  captain_stage_deadline_at: Date | null;
  team_a_captain_id: string | null;
  team_b_captain_id: string | null;
};

export async function lockRoom(
  client: PoolClient,
  matchId: number,
): Promise<LockedRoom> {
  const result = await client.query<LockedRoom>(
    `SELECT room.status, match.host_player_id::text, match.best_of::int,
       room.captain_stage_deadline_at,
       room.team_a_captain_id::text, room.team_b_captain_id::text
     FROM season_match_rooms room
     JOIN season_matches match ON match.id = room.match_id
     WHERE room.match_id = $1 FOR UPDATE OF room, match`,
    [matchId],
  );
  const room = result.rows[0];
  if (!room) throw new SeasonLobbyRoomError("Комната лобби не найдена", 404);
  return room;
}

export async function participantSide(
  client: PoolClient,
  matchId: number,
  playerId: string,
): Promise<"a" | "b"> {
  const result = await client.query<{ team_side: "a" | "b" }>(
    `SELECT participant.team_side
     FROM season_match_room_players participant
     JOIN season_matches match ON match.id = participant.match_id
     JOIN season_lobbies lobby ON lobby.id = match.lobby_id
     JOIN season_rounds round ON round.id = lobby.round_id
     WHERE participant.match_id = $1 AND participant.player_id = $2
       AND match.status NOT IN ('cancelled', 'completed')
       AND round.is_visible = TRUE
       AND (
         (round.round_kind = 'regular'
           AND round.lobby_configuration_status = 'published')
         OR
         (round.round_kind = 'finals'
           AND match.status IN ('published', 'completed'))
       )`,
    [matchId, playerId],
  );
  const side = result.rows[0]?.team_side;
  if (!side) {
    throw new SeasonLobbyRoomError("Вы не участвуете в этом лобби", 403);
  }
  return side;
}

export async function requireOrganizerLobby(
  client: PoolClient,
  matchId: number,
): Promise<void> {
  const result = await client.query(
    `SELECT 1
     FROM season_matches match
     JOIN season_lobbies lobby ON lobby.id = match.lobby_id
     JOIN season_rounds round ON round.id = lobby.round_id
     JOIN tournaments tournament ON tournament.id = round.tournament_id
     WHERE match.id = $1 AND tournament.tournament_type = 'seasonal'
       AND match.status NOT IN ('cancelled', 'completed')`,
    [matchId],
  );
  if (!result.rowCount) {
    throw new SeasonLobbyRoomError("Лобби не найдено", 404);
  }
}

export async function requireReadyTeams(
  client: PoolClient,
  matchId: number,
  isForced: boolean,
): Promise<void> {
  const presence = await client.query<{
    player_count: number;
    online_count: number;
    team_a_count: number;
    team_b_count: number;
  }>(
    `SELECT COUNT(*)::int AS player_count,
       COUNT(presence.player_id) FILTER (
         WHERE presence.heartbeat_at >= NOW()
           - ($2::int * INTERVAL '1 second')
       )::int AS online_count,
       COUNT(*) FILTER (WHERE participant.team_side = 'a')::int
         AS team_a_count,
       COUNT(*) FILTER (WHERE participant.team_side = 'b')::int
         AS team_b_count
     FROM season_match_room_players participant
     LEFT JOIN season_match_room_presence presence
       ON presence.match_id = participant.match_id
      AND presence.player_id = participant.player_id
     WHERE participant.match_id = $1`,
    [matchId, SEASON_LOBBY_PRESENCE_TTL_SECONDS],
  );
  const counts = presence.rows[0];
  if (
    counts.player_count !== 10 ||
    counts.team_a_count !== 5 ||
    counts.team_b_count !== 5
  ) {
    throw new SeasonLobbyRoomError(
      "Для запуска в каждой команде должно быть ровно по 5 игроков",
      409,
    );
  }
  if (!isForced && counts.online_count !== 10) {
    throw new SeasonLobbyRoomError(
      "Не все игроки сейчас в комнате. Используйте принудительный старт",
      409,
    );
  }
}
