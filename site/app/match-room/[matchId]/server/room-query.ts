import type { AuthUser } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { SEASON_LOBBY_CHAT_LIMIT } from "@/lib/season-lobby-room";
import type {
  MatchRoomGame,
  MatchRoomMessage,
  MatchRoomReport,
  MatchRoomSnapshot,
  MatchRoomStatus,
} from "../model/types";
import { requireMatchRoom } from "./room-access";

type StateRow = { status: MatchRoomStatus; currentGameNumber: number };
type MessageRow = Omit<MatchRoomMessage, "createdAt"> & { createdAt: Date };

export async function loadMatchRoomSnapshot(
  actor: AuthUser,
  matchId: number,
): Promise<MatchRoomSnapshot> {
  return transaction(async (client) => {
    const target = await requireMatchRoom(client, matchId, actor);
    await client.query(
      `INSERT INTO ordinary_match_rooms(match_id) VALUES ($1)
       ON CONFLICT (match_id) DO NOTHING`,
      [matchId],
    );
    const [stateResult, gameResult, reportResult, messageResult] =
      await Promise.all([
        client.query<StateRow>(
          `SELECT status, current_game_number::int AS "currentGameNumber"
           FROM ordinary_match_rooms WHERE match_id = $1`,
          [matchId],
        ),
        client.query<MatchRoomGame>(
          `SELECT game_number::int AS "gameNumber", dota_match_id AS "dotaMatchId",
             winner_side AS "winnerSide", resolution_method AS "resolutionMethod"
           FROM ordinary_match_games WHERE match_id = $1 ORDER BY game_number`,
          [matchId],
        ),
        client.query<MatchRoomReport>(
          `SELECT report.captain_id::text AS "captainId",
             COALESCE(player.ingame_name, report.captain_id::text) AS "captainName",
             report.dota_match_id AS "dotaMatchId", report.winner_side AS "winnerSide"
           FROM ordinary_match_game_reports report
           LEFT JOIN players player ON player.discord_id = report.captain_id
           JOIN ordinary_match_rooms room ON room.match_id = report.match_id
           WHERE report.match_id = $1 AND report.game_number = room.current_game_number
           ORDER BY report.submitted_at`,
          [matchId],
        ),
        client.query<MessageRow>(
          `SELECT message.id::int, message.player_id::text AS "playerId",
             COALESCE(player.ingame_name, message.player_id::text) AS nickname,
             player.avatar_url AS "avatarUrl", message.message,
             message.created_at AS "createdAt"
           FROM (
             SELECT * FROM ordinary_match_room_messages
             WHERE match_id = $1 ORDER BY id DESC LIMIT $2
           ) message
           LEFT JOIN players player ON player.discord_id = message.player_id
           ORDER BY message.id`,
          [matchId, SEASON_LOBBY_CHAT_LIMIT],
        ),
      ]);
    const state = stateResult.rows[0];
    const teamAScore = gameResult.rows.filter((game) => game.winnerSide === "a").length;
    const teamBScore = gameResult.rows.length - teamAScore;
    return {
      matchId,
      tournamentSlug: target.tournamentSlug,
      tournamentName: target.tournamentName,
      stage: target.stage,
      bestOf: target.bestOf,
      status: state.status,
      currentGameNumber: state.currentGameNumber,
      teamAName: target.teamAName,
      teamBName: target.teamBName,
      teamACaptainId: target.teamACaptainId,
      teamBCaptainId: target.teamBCaptainId,
      teamACaptainName: target.teamACaptainName,
      teamBCaptainName: target.teamBCaptainName,
      teamAScore,
      teamBScore,
      currentUserId: actor.discordId,
      currentUserSide: target.currentUserSide,
      isOrganizer: actor.isAdmin,
      games: gameResult.rows,
      reports: reportResult.rows,
      messages: messageResult.rows.map((message) => ({
        ...message,
        createdAt: message.createdAt.toISOString(),
      })),
    };
  });
}
