import type { AuthUser } from "@/lib/auth";
import { transaction } from "@/lib/db";
import {
  SEASON_LOBBY_CHAT_LIMIT,
  SEASON_LOBBY_PRESENCE_TTL_SECONDS,
} from "@/lib/season-lobby-room";
import type {
  SeasonLobbyRoomMessage,
  SeasonLobbyRoomPlayer,
  SeasonLobbyRoomSnapshot,
  SeasonLobbyRoomStatus,
} from "../model/types";
import { SeasonLobbyRoomError } from "./errors";

type RoomTargetRow = {
  match_id: number;
  tournament_slug: string;
  round_number: number;
  lobby_name: string;
  team_a_name: string;
  team_b_name: string;
  best_of: number;
  host_player_id: string | null;
  current_user_team_side: "a" | "b" | null;
};

type RoomStateRow = {
  status: SeasonLobbyRoomStatus;
  is_force_started: boolean;
  draft_series_id: number | null;
};

type RoomMessageRow = Omit<SeasonLobbyRoomMessage, "createdAt"> & {
  createdAt: Date;
};

async function loadRoomTarget(
  client: import("pg").PoolClient,
  matchId: number,
  playerId: string,
  isOrganizer: boolean,
): Promise<RoomTargetRow> {
  const result = await client.query<RoomTargetRow>(
    `SELECT match.id::int AS match_id, tournament.slug AS tournament_slug,
       round.round_number::int, lobby.name AS lobby_name,
       match.team_a_name, match.team_b_name, match.best_of::int,
       match.host_player_id::text,
       viewer.team_side AS current_user_team_side
     FROM season_matches match
     JOIN season_lobbies lobby ON lobby.id = match.lobby_id
     JOIN season_rounds round ON round.id = lobby.round_id
     JOIN tournaments tournament ON tournament.id = round.tournament_id
     LEFT JOIN season_match_room_players viewer
       ON viewer.match_id = match.id AND viewer.player_id = $2
     WHERE match.id = $1 AND tournament.tournament_type = 'seasonal'
       AND match.status <> 'cancelled'
       AND (
         $3::boolean
         OR (
           viewer.player_id IS NOT NULL
           AND round.is_visible = TRUE
           AND (
             (round.round_kind = 'regular'
               AND round.lobby_configuration_status = 'published')
             OR
             (round.round_kind = 'finals'
               AND match.status IN ('published', 'completed'))
           )
         )
       )`,
    [matchId, playerId, isOrganizer],
  );
  const target = result.rows[0];
  if (!target) {
    throw new SeasonLobbyRoomError(
      "Комната доступна только участникам лобби и организаторам",
      403,
    );
  }
  return target;
}

export async function loadSeasonLobbyRoomSnapshot(
  user: AuthUser,
  matchId: number,
): Promise<SeasonLobbyRoomSnapshot> {
  return transaction(async (client) => {
    const target = await loadRoomTarget(
      client,
      matchId,
      user.discordId,
      user.isAdmin,
    );
    await client.query(
      `INSERT INTO season_match_rooms(match_id) VALUES ($1)
       ON CONFLICT (match_id) DO NOTHING`,
      [matchId],
    );
    if (target.current_user_team_side) {
      await client.query(
        `INSERT INTO season_match_room_presence(match_id, player_id)
         VALUES ($1, $2)
         ON CONFLICT (match_id, player_id) DO UPDATE
           SET heartbeat_at = NOW()`,
        [matchId, user.discordId],
      );
    }

    const [stateResult, playerResult, messageResult, ownVoteResult] =
      await Promise.all([
        client.query<RoomStateRow>(
          `SELECT room.status, room.is_force_started,
             series.id::int AS draft_series_id
           FROM season_match_rooms room
           LEFT JOIN draft_series series ON series.season_match_id = room.match_id
           WHERE room.match_id = $1`,
          [matchId],
        ),
        client.query<SeasonLobbyRoomPlayer>(
          `SELECT room_player.player_id::text AS "playerId",
             COALESCE(current_player.steam_id32, player.steam_id32)::text
               AS "dotaId",
             CASE
               WHEN room_player.player_id = room_player.source_player_id
                 THEN COALESCE(NULLIF(participant.nickname_snapshot, ''),
                   current_player.ingame_name, player.ingame_name)
               ELSE COALESCE(current_player.ingame_name, player.ingame_name)
             END AS nickname,
             COALESCE(NULLIF(current_player.avatar_url, ''), player.avatar_url)
               AS "avatarUrl",
             room_player.team_side AS "teamSide",
             room_player.tier_snapshot::int AS tier,
             room_player.slot_number::int AS "slotNumber",
             room_player.player_id IN (
               room.team_a_captain_id, room.team_b_captain_id
             ) AS "isCaptain",
             room_player.player_id = match.host_player_id AS "isHost",
             presence.heartbeat_at >= NOW()
               - ($2::int * INTERVAL '1 second') AS "isOnline",
             vote.voter_player_id IS NOT NULL AS "hasVoted"
           FROM season_match_room_players room_player
           JOIN season_match_participants participant
             ON participant.match_id = room_player.match_id
            AND participant.player_id = room_player.source_player_id
           JOIN season_matches match ON match.id = room_player.match_id
           JOIN season_match_rooms room ON room.match_id = room_player.match_id
           JOIN players player ON player.discord_id = room_player.player_id
           LEFT JOIN player_identity_members identity_member
             ON identity_member.player_id = room_player.player_id
           LEFT JOIN player_identities identity
             ON identity.id = identity_member.identity_id
           LEFT JOIN players current_player
             ON current_player.discord_id = identity.registered_player_id
            AND current_player.is_archived = FALSE
           LEFT JOIN season_match_room_presence presence
             ON presence.match_id = room_player.match_id
            AND presence.player_id = room_player.player_id
           LEFT JOIN season_match_captain_votes vote
             ON vote.match_id = room_player.match_id
            AND vote.voter_player_id = room_player.player_id
           WHERE room_player.match_id = $1
           ORDER BY room_player.team_side,
             room_player.slot_number NULLS LAST, room_player.player_id`,
          [matchId, SEASON_LOBBY_PRESENCE_TTL_SECONDS],
        ),
        client.query<RoomMessageRow>(
          `SELECT message.id::int, message.player_id::text AS "playerId",
             player.ingame_name AS nickname,
             player.avatar_url AS "avatarUrl", message.message,
             message.created_at AS "createdAt"
           FROM (
             SELECT * FROM season_match_room_messages
             WHERE match_id = $1 ORDER BY id DESC LIMIT $2
           ) message
           JOIN players player ON player.discord_id = message.player_id
           ORDER BY message.id`,
          [matchId, SEASON_LOBBY_CHAT_LIMIT],
        ),
        client.query<{ candidate_player_id: string }>(
          `SELECT candidate_player_id::text
           FROM season_match_captain_votes
           WHERE match_id = $1 AND voter_player_id = $2`,
          [matchId, user.discordId],
        ),
      ]);

    const state = stateResult.rows[0];
    const players = playerResult.rows;
    const ownTeam = players.filter(
      (player) => player.teamSide === target.current_user_team_side,
    );
    return {
      serverNow: new Date().toISOString(),
      matchId: target.match_id,
      tournamentSlug: target.tournament_slug,
      roundNumber: target.round_number,
      lobbyName: target.lobby_name,
      teamAName: target.team_a_name,
      teamBName: target.team_b_name,
      bestOf: target.best_of,
      status: state.status,
      currentUserId: user.discordId,
      currentUserTeamSide: target.current_user_team_side,
      isOrganizer: user.isAdmin,
      hostPlayerId: target.host_player_id,
      isHost: target.host_player_id === user.discordId,
      isForceStarted: state.is_force_started,
      allPlayersOnline:
        players.length === 10 && players.every((player) => player.isOnline),
      players,
      messages: messageResult.rows.map((message) => ({
        ...message,
        createdAt: message.createdAt.toISOString(),
      })),
      ownVoteCandidateId:
        ownVoteResult.rows[0]?.candidate_player_id ?? null,
      teamVoteCount: ownTeam.filter((player) => player.hasVoted).length,
      teamPlayerCount: ownTeam.length,
      draftSeriesId: state.draft_series_id,
    };
  });
}
