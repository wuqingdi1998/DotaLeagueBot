import { transaction } from "@/lib/db";
import { enumValue, requiredId, textValue } from "./season-admin-model";
import {
  addSeasonParticipant,
  resolveSeasonPlayer,
} from "./season-admin-player";

const medals = ["gold", "silver"] as const;

export async function saveSeasonFinalist(body: Record<string, unknown>) {
  const tournamentId = requiredId(body.tournamentId, "турнир");
  const seed = body.seed ? Number(body.seed) : null;
  if (seed !== null && (!Number.isInteger(seed) || seed < 1 || seed > 100)) {
    throw new Response("Номер посева должен быть от 1 до 100", { status: 400 });
  }
  const medal = body.medal
    ? enumValue(body.medal, medals, "медаль")
    : null;
  return transaction(async (client) => {
    const player = await resolveSeasonPlayer(client, body.playerId);
    await addSeasonParticipant(client, tournamentId, player.discord_id);
    await client.query(
      `INSERT INTO season_finalists
        (tournament_id, player_id, seed, medal, note)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tournament_id, player_id)
       DO UPDATE SET seed = EXCLUDED.seed, medal = EXCLUDED.medal,
         note = EXCLUDED.note, updated_at = NOW()`,
      [
        tournamentId,
        player.discord_id,
        seed,
        medal,
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
       RETURNING player_id`,
      [tournamentId, player.discord_id],
    );
    if (!removed.rowCount) {
      throw new Response("Финалист не найден", { status: 404 });
    }
    return { ok: true };
  });
}
