import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { transaction } from "@/lib/db";
import {
  isCloseGameFormat,
  validCloseBestOf,
} from "@/lib/close-tournament";

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as Record<string, unknown>;
    const tournamentId = Number(body.tournamentId);
    const format = body.format;
    const bestOf = Number(body.bestOf);
    if (
      !Number.isInteger(tournamentId) ||
      tournamentId <= 0 ||
      !isCloseGameFormat(format) ||
      !validCloseBestOf(format, bestOf)
    ) {
      return Response.json(
        { error: "Выберите корректный формат клоза и количество карт" },
        { status: 400 },
      );
    }

    await transaction(async (client) => {
      const target = await client.query<{ close_event_id: number }>(
        `SELECT event.id::int AS close_event_id
         FROM close_events event
         WHERE event.tournament_id = $1
           AND NOT EXISTS (
             SELECT 1
             FROM season_rounds round
             JOIN season_lobbies lobby ON lobby.round_id = round.id
             JOIN season_matches match ON match.lobby_id = lobby.id
             JOIN season_match_rooms room ON room.match_id = match.id
             WHERE round.tournament_id = event.tournament_id
               AND room.status <> 'waiting'
           )
           AND NOT EXISTS (
             SELECT 1
             FROM season_rounds round
             JOIN season_lobbies lobby ON lobby.round_id = round.id
             JOIN season_matches match ON match.lobby_id = lobby.id
             WHERE round.tournament_id = event.tournament_id
               AND match.status <> 'draft'
           )
         FOR UPDATE OF event`,
        [tournamentId],
      );
      if (!target.rowCount) {
        throw new Response(
          "Настройки уже нельзя менять после запуска матча",
          { status: 409 },
        );
      }
      await client.query(
        `UPDATE tournaments
         SET format = $2, updated_at = NOW()
         WHERE id = $1`,
        [tournamentId, format],
      );
      await client.query(
        `UPDATE close_events
         SET game_format = $2, series = $3
         WHERE id = $1`,
        [target.rows[0].close_event_id, format, String(bestOf)],
      );
      await client.query(
        `UPDATE season_matches match
         SET best_of = $2, updated_at = NOW()
         FROM season_lobbies lobby, season_rounds round
         WHERE match.lobby_id = lobby.id
           AND lobby.round_id = round.id
           AND round.tournament_id = $1
           AND match.status = 'draft'`,
        [tournamentId, bestOf],
      );
      await client.query(
        `INSERT INTO tournament_audit_log
          (tournament_id, actor_discord_id, action, entity_type, entity_id,
           details)
         VALUES ($1, $2, 'update_close_settings', 'close_event', $3, $4::jsonb)`,
        [
          tournamentId,
          admin.discordId,
          String(target.rows[0].close_event_id),
          JSON.stringify({ format, bestOf }),
        ],
      );
    });
    return Response.json({ ok: true });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
