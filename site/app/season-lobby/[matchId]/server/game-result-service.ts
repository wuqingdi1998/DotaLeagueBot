import { transaction } from "@/lib/db";
import { syncSeasonFinalAwards } from "@/lib/season-final-awards";
import {
  isFinalSeasonGame,
  seasonSeriesScore,
  type SeasonGameWinner,
} from "../model/game-result";
import { SeasonLobbyRoomError } from "./errors";

type LockedGameResultRoom = {
  status: "waiting" | "voting" | "drafting" | "playing" | "break" | "completed";
  host_player_id: string | null;
  best_of: number;
  tournament_id: number;
  series_id: number;
  current_map: number;
  map_status: string;
};

function dotaMatchId(value: unknown): string {
  const matchId = String(value ?? "").trim();
  if (!/^\d{1,32}$/.test(matchId)) {
    throw new SeasonLobbyRoomError(
      "ID матча должен содержать только цифры",
    );
  }
  return matchId;
}

function gameWinner(value: unknown): SeasonGameWinner {
  if (value !== "a" && value !== "b") {
    throw new SeasonLobbyRoomError("Выберите победителя карты");
  }
  return value;
}

export async function reportSeasonLobbyGameResult(
  seasonMatchId: number,
  actorPlayerId: string,
  rawDotaMatchId: unknown,
  rawWinnerSide: unknown,
): Promise<void> {
  const matchId = dotaMatchId(rawDotaMatchId);
  const winnerSide = gameWinner(rawWinnerSide);

  await transaction(async (client) => {
    const roomResult = await client.query<LockedGameResultRoom>(
      `SELECT room.status, match.host_player_id::text, match.best_of::int,
         round.tournament_id::int, series.id::int AS series_id,
         series.current_map::int, map.status AS map_status
       FROM season_match_rooms room
       JOIN season_matches match ON match.id = room.match_id
       JOIN season_lobbies lobby ON lobby.id = match.lobby_id
       JOIN season_rounds round ON round.id = lobby.round_id
       JOIN draft_series series ON series.season_match_id = match.id
       JOIN draft_maps map ON map.series_id = series.id
         AND map.map_number = series.current_map
       WHERE room.match_id = $1
       FOR UPDATE OF room, match, series, map`,
      [seasonMatchId],
    );
    const room = roomResult.rows[0];
    if (!room) {
      throw new SeasonLobbyRoomError("Комната лобби не найдена", 404);
    }
    if (room.status !== "playing") {
      throw new SeasonLobbyRoomError(
        "Результат можно внести только после завершения драфта",
        409,
      );
    }
    if (room.host_player_id !== actorPlayerId) {
      throw new SeasonLobbyRoomError(
        "Результат карты может внести только хост лобби",
        403,
      );
    }
    if (room.map_status !== "COMPLETE") {
      throw new SeasonLobbyRoomError("Драфт карты ещё не завершён", 409);
    }

    await client.query(
      `INSERT INTO season_match_games
        (match_id, game_number, dota_match_id, winner_side, status)
       VALUES ($1, $2, $3, $4, 'completed')
       ON CONFLICT (match_id, game_number) DO UPDATE
       SET dota_match_id = EXCLUDED.dota_match_id,
         winner_side = EXCLUDED.winner_side,
         status = 'completed', updated_at = NOW()`,
      [seasonMatchId, room.current_map, matchId, winnerSide],
    );

    if (!isFinalSeasonGame(room.current_map, room.best_of)) {
      await client.query(
        `UPDATE season_match_rooms
         SET status = 'break', updated_at = NOW()
         WHERE match_id = $1`,
        [seasonMatchId],
      );
      return;
    }

    const games = await client.query<{ winner_side: SeasonGameWinner }>(
      `SELECT winner_side
       FROM season_match_games
       WHERE match_id = $1 AND status = 'completed'
         AND game_number BETWEEN 1 AND $2
         AND winner_side IN ('a', 'b')
       ORDER BY game_number`,
      [seasonMatchId, room.best_of],
    );
    if (games.rows.length !== room.best_of) {
      throw new SeasonLobbyRoomError(
        "Не удалось найти результаты всех карт",
        409,
      );
    }
    const score = seasonSeriesScore(
      games.rows.map((game) => game.winner_side),
    );
    await client.query(
      `UPDATE season_matches
       SET team_a_score = $2, team_b_score = $3, result = $4,
         status = 'completed', updated_at = NOW()
       WHERE id = $1`,
      [
        seasonMatchId,
        score.teamAScore,
        score.teamBScore,
        score.result,
      ],
    );
    await client.query(
      `UPDATE draft_series
       SET status = 'COMPLETE', updated_at = NOW()
       WHERE id = $1`,
      [room.series_id],
    );
    await client.query(
      `UPDATE season_match_rooms
       SET status = 'completed', updated_at = NOW()
       WHERE match_id = $1`,
      [seasonMatchId],
    );
    await client.query(
      `UPDATE season_lobbies lobby
       SET status = 'completed', updated_at = NOW()
       WHERE lobby.id = (
         SELECT match.lobby_id FROM season_matches match WHERE match.id = $1
       )
       AND NOT EXISTS (
         SELECT 1 FROM season_matches sibling
         WHERE sibling.lobby_id = lobby.id
           AND sibling.status <> 'completed'
       )`,
      [seasonMatchId],
    );
    await client.query(
      `INSERT INTO tournament_audit_log
        (tournament_id, actor_discord_id, action, entity_type, entity_id,
         details)
       VALUES ($1, $2, 'complete', 'season_match', $3, $4::jsonb)`,
      [
        room.tournament_id,
        actorPlayerId,
        String(seasonMatchId),
        JSON.stringify(score),
      ],
    );
    await syncSeasonFinalAwards(
      client,
      room.tournament_id,
      actorPlayerId,
    );
  });
}
