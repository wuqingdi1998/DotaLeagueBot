import { transaction } from "@/lib/db";
import { requiredId } from "./season-admin-model";
import { syncSeasonLobbyNotifications } from
  "./season-lobby-notification-actions";

export async function setSeasonLobbyHost(
  body: Record<string, unknown>,
  actorDiscordId: string,
) {
  const matchId = requiredId(body.matchId, "матч лобби");
  const playerId = String(body.playerId ?? "").trim();
  if (playerId && !/^\d{5,20}$/.test(playerId)) {
    throw new Response("Игрок не найден", { status: 404 });
  }
  return transaction(async (client) => {
    const target = await client.query<{
      tournament_id: number;
      host_player_id: string | null;
      lobby_configuration_status: string;
    }>(
      `SELECT round.tournament_id::int,
         match.host_player_id::text, round.lobby_configuration_status
       FROM season_matches match
       JOIN season_lobbies lobby ON lobby.id = match.lobby_id
       JOIN season_rounds round ON round.id = lobby.round_id
       JOIN tournaments tournament ON tournament.id = round.tournament_id
       WHERE match.id = $1 AND tournament.tournament_type = 'seasonal'
         AND match.status NOT IN ('cancelled', 'completed')
         AND (
           (round.round_kind = 'regular'
             AND round.lobby_configuration_status IN ('locked', 'published'))
           OR
           (round.round_kind = 'finals'
             AND match.status = 'published')
         )
       FOR UPDATE OF match`,
      [matchId],
    );
    if (!target.rowCount) {
      throw new Response(
        "Выбрать хоста можно после фиксации лобби и до завершения матча",
        { status: 409 },
      );
    }
    if (playerId) {
      const participant = await client.query(
        `SELECT 1 FROM season_match_room_players
         WHERE match_id = $1 AND player_id = $2`,
        [matchId, playerId],
      );
      if (!participant.rowCount) {
        throw new Response("Хостом может стать только игрок этого лобби", {
          status: 409,
        });
      }
    } else if (target.rows[0].host_player_id === null) {
      return { ok: true };
    }
    await client.query(
      "UPDATE season_matches SET host_player_id = $2, updated_at = NOW() WHERE id = $1",
      [matchId, playerId || null],
    );
    if (target.rows[0].lobby_configuration_status === "published") {
      await syncSeasonLobbyNotifications(client, matchId);
    }
    await client.query(
      `INSERT INTO tournament_audit_log
        (tournament_id, actor_discord_id, action, entity_type, entity_id,
         details)
       VALUES ($1, $2, $3, 'season_lobby', $4, $5::jsonb)`,
      [
        target.rows[0].tournament_id,
        actorDiscordId,
        playerId ? "assign_host" : "remove_host",
        String(matchId),
        JSON.stringify({ playerId: playerId || null }),
      ],
    );
    return { ok: true };
  });
}
