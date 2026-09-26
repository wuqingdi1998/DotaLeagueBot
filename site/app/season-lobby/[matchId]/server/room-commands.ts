import type { PoolClient } from "pg";
import { transaction } from "@/lib/db";
import { isDirectCloseGameFormat } from "@/lib/close-tournament";
import { SEASON_LOBBY_CHAT_MAX_LENGTH } from "@/lib/season-lobby-room";
import { createSeasonLobbyDraft } from "./captain-draft";
import { SeasonLobbyRoomError } from "./errors";
import {
  lockRoom,
  participantSide,
  requireOrganizerLobby,
  requireReadyTeams,
  type RoomActor,
} from "./room-access";

export async function sendSeasonLobbyMessage(
  matchId: number,
  actor: RoomActor,
  rawMessage: unknown,
): Promise<void> {
  const message = String(rawMessage ?? "").trim();
  if (
    !message ||
    message.includes("\0") ||
    message.length > SEASON_LOBBY_CHAT_MAX_LENGTH
  ) {
    throw new SeasonLobbyRoomError(
      `Сообщение должно содержать от 1 до ${SEASON_LOBBY_CHAT_MAX_LENGTH} символов`,
    );
  }
  await transaction(async (client) => {
    if (actor.isAdmin) {
      await requireOrganizerLobby(client, matchId);
    } else {
      await participantSide(client, matchId, actor.discordId);
    }
    const recent = await client.query(
      `SELECT 1 FROM season_match_room_messages
       WHERE match_id = $1 AND player_id = $2
         AND created_at > NOW() - INTERVAL '750 milliseconds'
       LIMIT 1`,
      [matchId, actor.discordId],
    );
    if (recent.rowCount) {
      throw new SeasonLobbyRoomError("Не отправляйте сообщения так быстро", 429);
    }
    await client.query(
      `INSERT INTO season_match_room_messages(match_id, player_id, message)
       VALUES ($1, $2, $3)`,
      [matchId, actor.discordId, message],
    );
  });
}

function captainId(rawCaptainId: unknown): string {
  const value = String(rawCaptainId ?? "");
  if (!/^\d{5,20}$/.test(value)) {
    throw new SeasonLobbyRoomError("Капитан не найден", 404);
  }
  return value;
}

async function manualCaptain(
  client: PoolClient,
  matchId: number,
  side: "a" | "b",
  playerId: string,
): Promise<string> {
  const result = await client.query(
    `SELECT 1 FROM season_match_room_players
     WHERE match_id = $1 AND team_side = $2 AND player_id = $3`,
    [matchId, side, playerId],
  );
  if (!result.rowCount) {
    throw new SeasonLobbyRoomError(
      `Капитан команды ${side.toUpperCase()} должен быть игроком этой команды`,
      409,
    );
  }
  return playerId;
}

export async function startSeasonLobbyWithCaptains(
  matchId: number,
  actor: RoomActor,
  rawTeamACaptainId: unknown,
  rawTeamBCaptainId: unknown,
  isForced: boolean,
): Promise<void> {
  if (!actor.isAdmin) {
    throw new SeasonLobbyRoomError(
      "Назначать капитанов вручную может только организатор",
      403,
    );
  }
  const teamA = captainId(rawTeamACaptainId);
  const teamB = captainId(rawTeamBCaptainId);
  await transaction(async (client) => {
    const room = await lockRoom(client, matchId);
    await requireOrganizerLobby(client, matchId);
    if (![
      "waiting",
      "captain_interest",
      "captain_voting",
      "captain_tiebreak",
      "captain_reveal",
    ].includes(room.status)) {
      throw new SeasonLobbyRoomError("Матч уже запущен", 409);
    }
    if (![2, 3].includes(room.best_of)) {
      throw new SeasonLobbyRoomError(
        "Fearless Draft для этого лобби должен иметь формат BO2 или BO3",
        409,
      );
    }
    await requireReadyTeams(client, matchId, isForced);
    const captains = {
      teamA: await manualCaptain(client, matchId, "a", teamA),
      teamB: await manualCaptain(client, matchId, "b", teamB),
    };
    await client.query(
      `UPDATE season_match_rooms
       SET is_force_started = $2, voting_started_at = COALESCE(
         voting_started_at, NOW()
       ), updated_at = NOW()
       WHERE match_id = $1`,
      [matchId, isForced],
    );
    await createSeasonLobbyDraft(client, matchId, room.best_of, captains);
  });
}

export async function startSeasonLobbyWithoutDraft(
  matchId: number,
  actor: RoomActor,
  isForced: boolean,
): Promise<void> {
  await transaction(async (client) => {
    const room = await lockRoom(client, matchId);
    if (actor.isAdmin) {
      await requireOrganizerLobby(client, matchId);
    } else {
      await participantSide(client, matchId, actor.discordId);
      if (room.host_player_id !== actor.discordId) {
        throw new SeasonLobbyRoomError("Начать может только хост лобби", 403);
      }
    }
    if (room.status !== "waiting") {
      throw new SeasonLobbyRoomError("Матч уже запущен", 409);
    }
    const format = await client.query<{ game_format: string }>(
      `SELECT tournament.format AS game_format
       FROM season_matches match
       JOIN season_lobbies lobby ON lobby.id = match.lobby_id
       JOIN season_rounds round ON round.id = lobby.round_id
       JOIN tournaments tournament ON tournament.id = round.tournament_id
       WHERE match.id = $1`,
      [matchId],
    );
    if (
      !format.rows[0] ||
      !isDirectCloseGameFormat(format.rows[0].game_format)
    ) {
      throw new SeasonLobbyRoomError(
        "Прямой старт доступен только для обычных форматов клоза",
        409,
      );
    }
    await requireReadyTeams(client, matchId, isForced);
    await client.query(
      `UPDATE season_match_rooms
       SET status = 'playing', is_force_started = $2,
         draft_started_at = NOW(), updated_at = NOW()
       WHERE match_id = $1`,
      [matchId, isForced],
    );
  });
}
