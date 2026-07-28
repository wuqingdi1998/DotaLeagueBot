import { transaction } from "@/lib/db";
import { requiredId, textValue } from "./season-admin-model";
import {
  addSeasonParticipant,
  resolveSeasonPlayer,
} from "./season-admin-player";

export async function saveSeasonFinalist(body: Record<string, unknown>) {
  const tournamentId = requiredId(body.tournamentId, "турнир");
  const seed = body.seed ? Number(body.seed) : null;
  if (seed !== null && (!Number.isInteger(seed) || seed < 1 || seed > 20)) {
    throw new Response("Номер посева должен быть от 1 до 20", { status: 400 });
  }
  return transaction(async (client) => {
    const player = await resolveSeasonPlayer(client, body.playerId);
    await addSeasonParticipant(client, tournamentId, player.discord_id);
    const capacity = await client.query<{ can_add: boolean }>(
      `SELECT (
         EXISTS (
           SELECT 1 FROM season_finalists
           WHERE tournament_id = $1 AND player_id = $2
         )
         OR (
           SELECT COUNT(*) FROM season_finalists WHERE tournament_id = $1
         ) < 20
       ) AS can_add
       FROM tournaments
       WHERE id = $1 AND tournament_type = 'seasonal'
       FOR UPDATE`,
      [tournamentId, player.discord_id],
    );
    if (!capacity.rowCount || !capacity.rows[0].can_add) {
      throw new Response("В финалы можно добавить не более 20 игроков", {
        status: 400,
      });
    }
    await client.query(
      `INSERT INTO season_finalists
        (tournament_id, player_id, seed, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tournament_id, player_id)
       DO UPDATE SET seed = EXCLUDED.seed, note = EXCLUDED.note,
         updated_at = NOW()`,
      [
        tournamentId,
        player.discord_id,
        seed,
        textValue(body.note, "", 240) || null,
      ],
    );
    return { ok: true };
  });
}

export async function deleteSeasonFinalist(body: Record<string, unknown>) {
  const tournamentId = requiredId(body.tournamentId, "турнир");
  return transaction(async (client) => {
    const player = await resolveSeasonPlayer(client, body.playerId);
    const removed = await client.query(
      `DELETE FROM season_finalists
       WHERE tournament_id = $1 AND player_id = $2
         AND NOT EXISTS (
           SELECT 1
           FROM season_match_participants participant
           JOIN season_matches match ON match.id = participant.match_id
           JOIN season_lobbies lobby ON lobby.id = match.lobby_id
           JOIN season_rounds round ON round.id = lobby.round_id
           WHERE participant.player_id = season_finalists.player_id
             AND round.tournament_id = season_finalists.tournament_id
             AND round.round_kind = 'finals'
         )
       RETURNING player_id`,
      [tournamentId, player.discord_id],
    );
    if (!removed.rowCount) {
      throw new Response(
        "Финалист не найден или уже добавлен в финальный матч",
        { status: 400 },
      );
    }
    return { ok: true };
  });
}
