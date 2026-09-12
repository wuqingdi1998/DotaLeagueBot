import type { PoolClient } from "pg";
import type { AuthUser } from "@/lib/auth";
import { transaction } from "@/lib/db";
import {
  evaluateCaptainReports,
  isSeriesComplete,
  seriesScore,
  type WinnerSide,
} from "../model/series";
import { MatchRoomError } from "./errors";
import { requireMatchRoom, type RoomTarget } from "./room-access";

function resultInput(rawDotaMatchId: unknown, rawWinnerSide: unknown) {
  const dotaMatchId = String(rawDotaMatchId ?? "").trim();
  if (!/^\d{5,20}$/.test(dotaMatchId)) {
    throw new MatchRoomError("Введите корректный числовой ID матча Dota 2");
  }
  if (rawWinnerSide !== "a" && rawWinnerSide !== "b") {
    throw new MatchRoomError("Выберите победившую команду");
  }
  return { dotaMatchId, winnerSide: rawWinnerSide as WinnerSide };
}

async function lockRoom(client: PoolClient, matchId: number) {
  await client.query(
    `INSERT INTO ordinary_match_rooms(match_id) VALUES ($1)
     ON CONFLICT (match_id) DO NOTHING`,
    [matchId],
  );
  const result = await client.query<{
    status: "active" | "disputed" | "completed";
    currentGameNumber: number;
  }>(
    `SELECT status, current_game_number::int AS "currentGameNumber"
     FROM ordinary_match_rooms WHERE match_id = $1 FOR UPDATE`,
    [matchId],
  );
  return result.rows[0];
}

async function recordAudit(
  client: PoolClient,
  target: RoomTarget,
  actor: AuthUser,
  action: string,
  details: object,
) {
  await client.query(
    `INSERT INTO tournament_audit_log
      (tournament_id, actor_discord_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, 'ordinary_match_room', $4, $5::jsonb)`,
    [target.tournamentId, actor.discordId, action, String(target.matchId), JSON.stringify(details)],
  );
}

async function finalizeGame(
  client: PoolClient,
  target: RoomTarget,
  actor: AuthUser,
  gameNumber: number,
  dotaMatchId: string,
  winnerSide: WinnerSide,
  method: "consensus" | "organizer",
) {
  await client.query(
    `INSERT INTO ordinary_match_games
      (match_id, game_number, dota_match_id, winner_side, resolution_method, resolved_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [target.matchId, gameNumber, dotaMatchId, winnerSide, method, method === "organizer" ? actor.discordId : null],
  );
  const games = await client.query<{ winnerSide: WinnerSide }>(
    `SELECT winner_side AS "winnerSide" FROM ordinary_match_games
     WHERE match_id = $1 ORDER BY game_number`,
    [target.matchId],
  );
  const score = seriesScore(games.rows.map((game) => game.winnerSide));
  const completed = isSeriesComplete(target.bestOf, games.rows.map((game) => game.winnerSide));
  await client.query(
    `UPDATE tournament_matches SET team_a_score = $2, team_b_score = $3,
       status = CASE WHEN $4 THEN 'finished' ELSE 'live' END,
       result_type = 'normal', team_a_result_label = NULL,
       team_b_result_label = NULL, decision_note = NULL, updated_at = NOW()
     WHERE id = $1`,
    [target.matchId, score.teamA, score.teamB, completed],
  );
  await client.query(
    `UPDATE ordinary_match_rooms SET status = $2,
       current_game_number = CASE WHEN $2 = 'completed' THEN current_game_number
         ELSE current_game_number + 1 END, updated_at = NOW()
     WHERE match_id = $1`,
    [target.matchId, completed ? "completed" : "active"],
  );
  await recordAudit(client, target, actor, method === "organizer" ? "resolve_dispute" : "confirm_map", {
    gameNumber, dotaMatchId, winnerSide, score, completed,
  });
}

export async function reportMatchRoomGame(
  matchId: number,
  actor: AuthUser,
  rawDotaMatchId: unknown,
  rawWinnerSide: unknown,
) {
  const input = resultInput(rawDotaMatchId, rawWinnerSide);
  await transaction(async (client) => {
    const target = await requireMatchRoom(client, matchId, actor, true);
    if (!target.currentUserSide) throw new MatchRoomError("Результат вводят только капитаны", 403);
    const room = await lockRoom(client, matchId);
    if (room.status !== "active") throw new MatchRoomError("Сейчас результат карты нельзя изменить", 409);
    const existing = await client.query(
      `SELECT 1 FROM ordinary_match_game_reports
       WHERE match_id = $1 AND game_number = $2 AND captain_id = $3`,
      [matchId, room.currentGameNumber, actor.discordId],
    );
    if (existing.rowCount) throw new MatchRoomError("Ваш результат уже сохранён", 409);
    await client.query(
      `INSERT INTO ordinary_match_game_reports
        (match_id, game_number, captain_id, dota_match_id, winner_side)
       VALUES ($1, $2, $3, $4, $5)`,
      [matchId, room.currentGameNumber, actor.discordId, input.dotaMatchId, input.winnerSide],
    );
    const reports = await client.query<{ dotaMatchId: string; winnerSide: WinnerSide }>(
      `SELECT dota_match_id AS "dotaMatchId", winner_side AS "winnerSide"
       FROM ordinary_match_game_reports WHERE match_id = $1 AND game_number = $2`,
      [matchId, room.currentGameNumber],
    );
    const evaluation = evaluateCaptainReports(reports.rows);
    if (evaluation === "disputed") {
      await client.query(
        `UPDATE ordinary_match_rooms SET status = 'disputed', updated_at = NOW()
         WHERE match_id = $1`,
        [matchId],
      );
      await recordAudit(client, target, actor, "open_dispute", { gameNumber: room.currentGameNumber });
    } else if (evaluation === "agreed") {
      await finalizeGame(client, target, actor, room.currentGameNumber, input.dotaMatchId, input.winnerSide, "consensus");
    }
  });
}

export async function resolveMatchRoomDispute(
  matchId: number,
  actor: AuthUser,
  rawDotaMatchId: unknown,
  rawWinnerSide: unknown,
) {
  if (!actor.isAdmin) throw new MatchRoomError("Разрешить спор может только организатор", 403);
  const input = resultInput(rawDotaMatchId, rawWinnerSide);
  await transaction(async (client) => {
    const target = await requireMatchRoom(client, matchId, actor, true);
    const room = await lockRoom(client, matchId);
    if (room.status !== "disputed") throw new MatchRoomError("В этой карте нет активного спора", 409);
    await finalizeGame(client, target, actor, room.currentGameNumber, input.dotaMatchId, input.winnerSide, "organizer");
  });
}
