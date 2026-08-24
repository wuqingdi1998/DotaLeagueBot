import { transaction } from "@/lib/db";
import { requiredId } from "./season-admin-model";

function matchIds(value: unknown): Array<string | null> {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Response("Укажите два ID матчей", { status: 400 });
  }
  return value.map((item) => {
    const matchId = String(item ?? "").trim();
    if (!matchId) return null;
    if (!/^\d{1,32}$/.test(matchId)) {
      throw new Response("ID матча должен содержать только цифры", {
        status: 400,
      });
    }
    return matchId;
  });
}

export async function savePublishedLobbyMatchIds(
  body: Record<string, unknown>,
  actorDiscordId: string,
) {
  const seasonMatchId = requiredId(body.matchId, "матч лобби");
  const dotaMatchIds = matchIds(body.dotaMatchIds);
  return transaction(async (client) => {
    const target = await client.query<{
      tournament_id: number;
      can_edit: boolean;
    }>(
      `SELECT round.tournament_id::int,
         (
           (round.round_kind = 'regular'
             AND round.lobby_configuration_status = 'published')
           OR
           (round.round_kind = 'finals'
             AND match.status IN ('published', 'completed'))
         ) AS can_edit
       FROM season_matches match
       JOIN season_lobbies lobby ON lobby.id = match.lobby_id
       JOIN season_rounds round ON round.id = lobby.round_id
       JOIN tournaments tournament ON tournament.id = round.tournament_id
       WHERE match.id = $1 AND tournament.tournament_type = 'seasonal'
       FOR UPDATE OF match`,
      [seasonMatchId],
    );
    if (!target.rowCount) {
      throw new Response("Матч лобби не найден", { status: 404 });
    }
    if (!target.rows[0].can_edit) {
      throw new Response("Сначала опубликуйте лобби", { status: 409 });
    }

    for (const [index, dotaMatchId] of dotaMatchIds.entries()) {
      await client.query(
        `INSERT INTO season_match_games
          (match_id, game_number, dota_match_id, status)
         VALUES ($1, $2, $3, 'published')
         ON CONFLICT (match_id, game_number)
         DO UPDATE SET dota_match_id = EXCLUDED.dota_match_id,
           updated_at = NOW()`,
        [seasonMatchId, index + 1, dotaMatchId],
      );
    }
    await client.query(
      `INSERT INTO tournament_audit_log
        (tournament_id, actor_discord_id, action, entity_type, entity_id,
         details)
       VALUES ($1, $2, 'update_match_ids', 'season_lobby', $3, $4::jsonb)`,
      [
        target.rows[0].tournament_id,
        actorDiscordId,
        String(seasonMatchId),
        JSON.stringify({ dotaMatchIds }),
      ],
    );
    return { ok: true };
  });
}
