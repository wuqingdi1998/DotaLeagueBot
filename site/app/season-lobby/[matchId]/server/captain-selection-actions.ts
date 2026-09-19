import { transaction } from "@/lib/db";
import { SEASON_CAPTAIN_STAGE_SECONDS } from "../model/captain-selection";
import { advanceCaptainSelection } from "./captain-selection";
import { SeasonLobbyRoomError } from "./errors";
import {
  lockRoom,
  participantSide,
  requireOrganizerLobby,
  requireReadyTeams,
  type RoomActor,
} from "./room-access";

type CaptainSelectionStage =
  | "captain_interest"
  | "captain_voting"
  | "captain_tiebreak";

async function keepStageCurrent(
  client: import("pg").PoolClient,
  matchId: number,
  expectedStage: CaptainSelectionStage,
  unavailableMessage: string,
): Promise<boolean> {
  const currentRoom = await lockRoom(client, matchId);
  if (currentRoom.status !== expectedStage) {
    throw new SeasonLobbyRoomError(unavailableMessage, 409);
  }
  await advanceCaptainSelection(client, matchId);
  return (await lockRoom(client, matchId)).status === expectedStage;
}

export async function startSeasonLobbyCaptainSelection(
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
      throw new SeasonLobbyRoomError("Выбор капитанов уже начался", 409);
    }
    if (![2, 3].includes(room.best_of)) {
      throw new SeasonLobbyRoomError(
        "Выбор капитанов доступен только для матчей лиги BO2 и BO3",
        409,
      );
    }
    await requireReadyTeams(client, matchId, isForced);
    await client.query(
      "DELETE FROM season_match_captain_tiebreaks WHERE match_id = $1",
      [matchId],
    );
    await client.query(
      "DELETE FROM season_match_captain_votes WHERE match_id = $1",
      [matchId],
    );
    await client.query(
      "DELETE FROM season_match_captain_preferences WHERE match_id = $1",
      [matchId],
    );
    await client.query(
      `UPDATE season_match_rooms
       SET status = 'captain_interest', is_force_started = $2,
         team_a_captain_id = NULL, team_b_captain_id = NULL,
         voting_started_at = NOW(),
         captain_stage_deadline_at = NOW() + ($3::int * INTERVAL '1 second'),
         updated_at = NOW()
       WHERE match_id = $1`,
      [matchId, isForced, SEASON_CAPTAIN_STAGE_SECONDS],
    );
  });
}

export async function answerCaptainInterest(
  matchId: number,
  playerId: string,
  wantsCaptain: unknown,
): Promise<void> {
  if (typeof wantsCaptain !== "boolean") {
    throw new SeasonLobbyRoomError("Выберите «Да» или «Нет»");
  }
  await transaction(async (client) => {
    if (!await keepStageCurrent(
      client,
      matchId,
      "captain_interest",
      "Опрос о капитанстве уже завершён",
    )) return;
    const side = await participantSide(client, matchId, playerId);
    const result = await client.query(
      `INSERT INTO season_match_captain_preferences
        (match_id, player_id, team_side, wants_to_be_captain)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (match_id, player_id) DO NOTHING
       RETURNING player_id`,
      [matchId, playerId, side, wantsCaptain],
    );
    if (!result.rowCount) {
      throw new SeasonLobbyRoomError(
        "Ответ уже зафиксирован и не может быть изменён",
        409,
      );
    }
    await advanceCaptainSelection(client, matchId);
  });
}

export async function voteForSeasonLobbyCaptain(
  matchId: number,
  voterPlayerId: string,
  rawCandidatePlayerId: unknown,
): Promise<void> {
  const candidatePlayerId = String(rawCandidatePlayerId ?? "");
  if (!/^\d{5,20}$/.test(candidatePlayerId)) {
    throw new SeasonLobbyRoomError("Кандидат не найден", 404);
  }
  await transaction(async (client) => {
    if (!await keepStageCurrent(
      client,
      matchId,
      "captain_voting",
      "Голосование сейчас недоступно",
    )) return;
    const result = await client.query<{ team_side: "a" | "b" }>(
      `SELECT voter.team_side
       FROM season_match_captain_preferences voter
       JOIN season_match_captain_preferences candidate
         ON candidate.match_id = voter.match_id
        AND candidate.player_id = $3
        AND candidate.team_side = voter.team_side
        AND candidate.wants_to_be_captain = TRUE
       JOIN season_match_rooms room ON room.match_id = voter.match_id
       WHERE voter.match_id = $1 AND voter.player_id = $2
         AND voter.wants_to_be_captain = FALSE
         AND CASE voter.team_side
           WHEN 'a' THEN room.team_a_captain_id IS NULL
           ELSE room.team_b_captain_id IS NULL
         END
         AND (
           SELECT COUNT(*) FROM season_match_captain_preferences team_candidate
           WHERE team_candidate.match_id = voter.match_id
             AND team_candidate.team_side = voter.team_side
             AND team_candidate.wants_to_be_captain = TRUE
         ) > 1`,
      [matchId, voterPlayerId, candidatePlayerId],
    );
    const side = result.rows[0]?.team_side;
    if (!side) {
      throw new SeasonLobbyRoomError(
        "Голосовать может только отказавшийся игрок за кандидата своей команды",
        403,
      );
    }
    const vote = await client.query(
      `INSERT INTO season_match_captain_votes
        (match_id, voter_player_id, candidate_player_id, team_side, is_automatic)
       VALUES ($1, $2, $3, $4, FALSE)
       ON CONFLICT (match_id, voter_player_id) DO NOTHING
       RETURNING voter_player_id`,
      [matchId, voterPlayerId, candidatePlayerId, side],
    );
    if (!vote.rowCount) {
      throw new SeasonLobbyRoomError(
        "Голос уже зафиксирован и не может быть изменён",
        409,
      );
    }
    await advanceCaptainSelection(client, matchId);
  });
}

export async function voteForSeasonLobbyCaptainTiebreak(
  matchId: number,
  voterPlayerId: string,
  rawCandidatePlayerId: unknown,
): Promise<void> {
  const candidatePlayerId = String(rawCandidatePlayerId ?? "");
  if (!/^\d{5,20}$/.test(candidatePlayerId)) {
    throw new SeasonLobbyRoomError("Кандидат не найден", 404);
  }
  await transaction(async (client) => {
    const room = await lockRoom(client, matchId);
    if (!["captain_voting", "captain_tiebreak"].includes(room.status)) {
      throw new SeasonLobbyRoomError("Решающая стадия уже завершена", 409);
    }
    await advanceCaptainSelection(client, matchId);
    const currentRoom = await lockRoom(client, matchId);
    if (!["captain_voting", "captain_tiebreak"].includes(currentRoom.status)) {
      return;
    }
    const result = await client.query<{ team_side: "a" | "b" }>(
      `UPDATE season_match_captain_tiebreaks
       SET selected_candidate_id = $3, responded_at = NOW()
       WHERE match_id = $1 AND voter_player_id = $2
         AND selected_candidate_id IS NULL
         AND $3 IN (candidate_one_id, candidate_two_id)
       RETURNING team_side`,
      [matchId, voterPlayerId, candidatePlayerId],
    );
    if (!result.rowCount) {
      throw new SeasonLobbyRoomError(
        "Решающий голос уже зафиксирован или вам недоступен",
        409,
      );
    }
    const side = result.rows[0].team_side;
    const captainColumn = side === "a"
      ? "team_a_captain_id"
      : "team_b_captain_id";
    await client.query(
      `UPDATE season_match_rooms
       SET ${captainColumn} = $2, updated_at = NOW()
       WHERE match_id = $1`,
      [matchId, candidatePlayerId],
    );
    await advanceCaptainSelection(client, matchId);
  });
}
