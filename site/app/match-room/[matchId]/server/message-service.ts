import type { AuthUser } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { SEASON_LOBBY_CHAT_MAX_LENGTH } from "@/lib/season-lobby-room";
import { MatchRoomError } from "./errors";
import { requireMatchRoom } from "./room-access";

export async function sendMatchRoomMessage(
  matchId: number,
  actor: AuthUser,
  rawMessage: unknown,
) {
  const message = String(rawMessage ?? "").trim();
  if (!message || message.includes("\0") || message.length > SEASON_LOBBY_CHAT_MAX_LENGTH) {
    throw new MatchRoomError(
      `Сообщение должно содержать от 1 до ${SEASON_LOBBY_CHAT_MAX_LENGTH} символов`,
    );
  }
  await transaction(async (client) => {
    await requireMatchRoom(client, matchId, actor);
    await client.query(
      `INSERT INTO ordinary_match_rooms(match_id) VALUES ($1)
       ON CONFLICT (match_id) DO NOTHING`,
      [matchId],
    );
    const recent = await client.query(
      `SELECT 1 FROM ordinary_match_room_messages
       WHERE match_id = $1 AND player_id = $2
         AND created_at > NOW() - INTERVAL '750 milliseconds' LIMIT 1`,
      [matchId, actor.discordId],
    );
    if (recent.rowCount) throw new MatchRoomError("Не отправляйте сообщения так быстро", 429);
    await client.query(
      `INSERT INTO ordinary_match_room_messages(match_id, player_id, message)
       VALUES ($1, $2, $3)`,
      [matchId, actor.discordId, message],
    );
  });
}
