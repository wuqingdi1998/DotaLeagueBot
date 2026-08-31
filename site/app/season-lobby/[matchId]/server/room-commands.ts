import type { PoolClient } from "pg";
import { transaction } from "@/lib/db";
import {
  SEASON_LOBBY_CHAT_MAX_LENGTH,
  chooseSeasonLobbyCaptain,
  seasonLobbyDraftFormat,
} from "@/lib/season-lobby-room";
import { hasActiveSeries, lockDraftPlayers } from
  "@/app/fearless-draft/server/database";
import { randomCoinTossResult } from
  "@/app/fearless-draft/server/coin-toss";
import { SeasonLobbyRoomError } from "./errors";

type LockedRoom = {
  status:
    | "waiting"
    | "voting"
    | "drafting"
    | "playing"
    | "break"
    | "completed";
  host_player_id: string | null;
  best_of: number;
};

type RoomActor = {
  discordId: string;
  isAdmin: boolean;
};

type RoomPresenceCounts = {
  player_count: number;
  online_count: number;
  team_a_count: number;
  team_b_count: number;
};

async function lockRoom(
  client: PoolClient,
  matchId: number,
): Promise<LockedRoom> {
  const result = await client.query<LockedRoom>(
    `SELECT room.status, match.host_player_id::text, match.best_of::int
     FROM season_match_rooms room
     JOIN season_matches match ON match.id = room.match_id
     WHERE room.match_id = $1 FOR UPDATE OF room, match`,
    [matchId],
  );
  const room = result.rows[0];
  if (!room) throw new SeasonLobbyRoomError("Комната лобби не найдена", 404);
  return room;
}

async function participantSide(
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

async function requireOrganizerLobby(
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

async function requireReadyTeams(
  client: PoolClient,
  matchId: number,
  isForced: boolean,
): Promise<void> {
  const presence = await client.query<RoomPresenceCounts>(
    `SELECT COUNT(*)::int AS player_count,
       COUNT(presence.player_id) FILTER (
         WHERE presence.heartbeat_at >= NOW() - INTERVAL '7 seconds'
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
    [matchId],
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

export async function startSeasonLobbyVoting(
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
      throw new SeasonLobbyRoomError("Голосование уже началось", 409);
    }
    if (!seasonLobbyDraftFormat(room.best_of)) {
      throw new SeasonLobbyRoomError(
        "Fearless Draft для этого лобби должен иметь формат BO2 или BO3",
        409,
      );
    }
    await requireReadyTeams(client, matchId, isForced);
    await client.query(
      `UPDATE season_match_rooms
       SET status = 'voting', is_force_started = $2,
           voting_started_at = NOW(), updated_at = NOW()
       WHERE match_id = $1`,
      [matchId, isForced],
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

type VoteCandidateRow = {
  player_id: string;
  tier_snapshot: number | null;
  slot_number: number | null;
  vote_count: number;
};

async function chosenCaptain(
  client: PoolClient,
  matchId: number,
  side: "a" | "b",
): Promise<string> {
  const result = await client.query<VoteCandidateRow>(
    `SELECT participant.player_id::text,
       participant.tier_snapshot::int, participant.slot_number::int,
       COUNT(vote.voter_player_id)::int AS vote_count
     FROM season_match_room_players participant
     LEFT JOIN season_match_captain_votes vote
       ON vote.match_id = participant.match_id
      AND vote.candidate_player_id = participant.player_id
     WHERE participant.match_id = $1 AND participant.team_side = $2
     GROUP BY participant.player_id, participant.tier_snapshot,
       participant.slot_number`,
    [matchId, side],
  );
  const winner = chooseSeasonLobbyCaptain(result.rows.map((row) => ({
    playerId: row.player_id,
    voteCount: row.vote_count,
    tier: row.tier_snapshot,
    slotNumber: row.slot_number,
  })));
  if (!winner) throw new SeasonLobbyRoomError("Не удалось выбрать капитана", 409);
  return winner.playerId;
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

async function createSeasonLobbyDraft(
  client: PoolClient,
  matchId: number,
  bestOf: number,
  manualCaptains?: { teamA: string; teamB: string },
): Promise<void> {
  const captainA = manualCaptains
    ? await manualCaptain(client, matchId, "a", manualCaptains.teamA)
    : await chosenCaptain(client, matchId, "a");
  const captainB = manualCaptains
    ? await manualCaptain(client, matchId, "b", manualCaptains.teamB)
    : await chosenCaptain(client, matchId, "b");
  const format = seasonLobbyDraftFormat(bestOf);
  if (!format) throw new SeasonLobbyRoomError("Формат драфта не поддерживается", 409);
  await lockDraftPlayers(client, [captainA, captainB]);
  if (
    (await hasActiveSeries(client, captainA)) ||
    (await hasActiveSeries(client, captainB))
  ) {
    throw new SeasonLobbyRoomError(
      "Один из выбранных капитанов уже участвует в другом Fearless Draft",
      409,
    );
  }
  const coinToss = randomCoinTossResult([captainA, captainB]);
  const seriesResult = await client.query<{ id: number }>(
    `INSERT INTO draft_series
      (player1_id, player2_id, format, map1_coin_toss_winner_id,
       season_match_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id::int`,
    [captainA, captainB, format, coinToss.winnerId, matchId],
  );
  await client.query(
    `INSERT INTO draft_maps
      (series_id, map_number, coin_toss_winner_id,
       coin_toss_segment, first_chooser_id)
     VALUES ($1, 1, $2, $3, $2)`,
    [seriesResult.rows[0].id, coinToss.winnerId, coinToss.segment],
  );
  await client.query(
    `UPDATE season_match_participants
     SET is_captain = CASE
       WHEN team_side = 'a' THEN player_id = $2
       ELSE player_id = $3
     END
     WHERE match_id = $1`,
    [matchId, captainA, captainB],
  );
  await client.query(
    `UPDATE season_match_rooms
     SET status = 'drafting', team_a_captain_id = $2,
       team_b_captain_id = $3, draft_started_at = NOW(), updated_at = NOW()
     WHERE match_id = $1`,
    [matchId, captainA, captainB],
  );
  await client.query(
    `UPDATE draft_invitations
     SET status = 'CANCELLED', responded_at = NOW()
     WHERE status = 'PENDING'
       AND (sender_id = ANY($1::bigint[]) OR recipient_id = ANY($1::bigint[]))`,
    [[captainA, captainB]],
  );
  await client.query(
    "DELETE FROM draft_queue WHERE player_id = ANY($1::bigint[])",
    [[captainA, captainB]],
  );
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
    if (!["waiting", "voting"].includes(room.status)) {
      throw new SeasonLobbyRoomError("Матч уже запущен", 409);
    }
    if (!seasonLobbyDraftFormat(room.best_of)) {
      throw new SeasonLobbyRoomError(
        "Fearless Draft для этого лобби должен иметь формат BO2 или BO3",
        409,
      );
    }
    await requireReadyTeams(client, matchId, isForced);
    await client.query(
      `UPDATE season_match_rooms
       SET is_force_started = $2, voting_started_at = COALESCE(
         voting_started_at, NOW()
       ), updated_at = NOW()
       WHERE match_id = $1`,
      [matchId, isForced],
    );
    await createSeasonLobbyDraft(client, matchId, room.best_of, {
      teamA,
      teamB,
    });
  });
}

export async function voteForSeasonLobbyCaptain(
  matchId: number,
  voterPlayerId: string,
  candidatePlayerId: unknown,
): Promise<void> {
  const candidate = String(candidatePlayerId ?? "");
  if (!/^\d{5,20}$/.test(candidate)) {
    throw new SeasonLobbyRoomError("Кандидат не найден", 404);
  }
  await transaction(async (client) => {
    const room = await lockRoom(client, matchId);
    if (room.status !== "voting") {
      throw new SeasonLobbyRoomError("Голосование сейчас недоступно", 409);
    }
    const side = await participantSide(client, matchId, voterPlayerId);
    const candidateSide = await participantSide(client, matchId, candidate);
    if (side !== candidateSide) {
      throw new SeasonLobbyRoomError(
        "Голосовать можно только за игрока своей команды",
        403,
      );
    }
    await client.query(
      `INSERT INTO season_match_captain_votes
        (match_id, voter_player_id, candidate_player_id, team_side)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (match_id, voter_player_id) DO UPDATE
         SET candidate_player_id = EXCLUDED.candidate_player_id,
             team_side = EXCLUDED.team_side, created_at = NOW()`,
      [matchId, voterPlayerId, candidate, side],
    );
    const progress = await client.query<{
      participant_count: number;
      vote_count: number;
    }>(
      `SELECT COUNT(DISTINCT participant.player_id)::int AS participant_count,
         COUNT(DISTINCT vote.voter_player_id)::int AS vote_count
       FROM season_match_room_players participant
       LEFT JOIN season_match_captain_votes vote
         ON vote.match_id = participant.match_id
        AND vote.voter_player_id = participant.player_id
       WHERE participant.match_id = $1`,
      [matchId],
    );
    const counts = progress.rows[0];
    if (counts.participant_count === 10 && counts.vote_count === 10) {
      await createSeasonLobbyDraft(client, matchId, room.best_of);
    }
  });
}
