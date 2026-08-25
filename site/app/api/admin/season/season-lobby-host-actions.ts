import { transaction } from "@/lib/db";
import { requiredId } from "./season-admin-model";

export async function setSeasonLobbyHost(
  body: Record<string, unknown>,
  actorDiscordId: string,
) {
  const matchId = requiredId(body.matchId, "матч лобби");
  const playerId = String(body.playerId ?? "").trim();
  if (!/^\d{5,20}$/.test(playerId)) {
    throw new Response("Игрок не найден", { status: 404 });
  }
  return transaction(async (client) => {
    const target = await client.query<{ tournament_id: number }>(
      `SELECT round.tournament_id::int
       FROM season_matches match
       JOIN season_lobbies lobby ON lobby.id = match.lobby_id
       JOIN season_rounds round ON round.id = lobby.round_id
       JOIN tournaments tournament ON tournament.id = round.tournament_id
       JOIN season_match_room_players participant
         ON participant.match_id = match.id AND participant.player_id = $2
       WHERE match.id = $1 AND tournament.tournament_type = 'seasonal'
         AND match.status <> 'cancelled'
         AND (
           (round.round_kind = 'regular'
             AND round.lobby_configuration_status = 'published')
           OR
           (round.round_kind = 'finals'
             AND match.status IN ('published', 'completed'))
         )
       FOR UPDATE OF match`,
      [matchId, playerId],
    );
    if (!target.rowCount) {
      throw new Response(
        "Хостом может стать только игрок опубликованного лобби",
        { status: 409 },
      );
    }
    await client.query(
      "UPDATE season_matches SET host_player_id = $2, updated_at = NOW() WHERE id = $1",
      [matchId, playerId],
    );
    await client.query(
      `INSERT INTO tournament_audit_log
        (tournament_id, actor_discord_id, action, entity_type, entity_id,
         details)
       VALUES ($1, $2, 'assign_host', 'season_lobby', $3, $4::jsonb)`,
      [
        target.rows[0].tournament_id,
        actorDiscordId,
        String(matchId),
        JSON.stringify({ playerId }),
      ],
    );
    return { ok: true };
  });
}
