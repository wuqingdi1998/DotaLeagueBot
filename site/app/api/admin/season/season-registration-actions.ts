import { transaction } from "@/lib/db";
import { requiredId } from "./season-admin-model";
import {
  addSeasonParticipant,
  resolveSeasonPlayer,
} from "./season-admin-player";

function registrationTier(value: unknown): number {
  const tier = Number(value);
  if (!Number.isInteger(tier) || tier < 1 || tier > 12) {
    throw new Response("Тир игрока должен быть от 1 до 12", { status: 400 });
  }
  return tier;
}

export async function addSeasonRoundRegistration(
  body: Record<string, unknown>,
  actorDiscordId: string,
) {
  const roundId = requiredId(body.roundId, "тур");
  const tierSnapshot = registrationTier(body.tierSnapshot);
  return transaction(async (client) => {
    const round = await client.query<{ tournament_id: number }>(
      `SELECT round.tournament_id::int
       FROM season_rounds round
       JOIN tournaments tournament ON tournament.id = round.tournament_id
       WHERE round.id = $1 AND round.round_kind = 'regular'
         AND tournament.tournament_type = 'seasonal'
       FOR UPDATE OF round`,
      [roundId],
    );
    if (!round.rowCount) {
      throw new Response("Обычный тур сезона не найден", { status: 404 });
    }
    const player = await resolveSeasonPlayer(client, body.playerId);
    const tournamentId = round.rows[0].tournament_id;
    await addSeasonParticipant(client, tournamentId, player.discord_id);
    await client.query(
      `INSERT INTO season_round_registrations
        (round_id, player_id, tier_snapshot)
       VALUES ($1, $2, $3)
       ON CONFLICT (round_id, player_id)
       DO UPDATE SET tier_snapshot = EXCLUDED.tier_snapshot`,
      [roundId, player.discord_id, tierSnapshot],
    );
    await client.query(
      `INSERT INTO tournament_audit_log
        (tournament_id, actor_discord_id, action, entity_type, entity_id,
         details)
       VALUES ($1, $2, 'manual_add', 'season_round_registration', $3,
         $4::jsonb)`,
      [
        tournamentId,
        actorDiscordId,
        `${roundId}:${player.discord_id}`,
        JSON.stringify({ roundId, playerId: player.discord_id, tierSnapshot }),
      ],
    );
    return { ok: true };
  });
}

export async function deleteSeasonRoundRegistration(
  body: Record<string, unknown>,
  actorDiscordId: string,
) {
  const roundId = requiredId(body.roundId, "тур");
  const player = String(body.playerId ?? "").trim();
  if (!/^\d{1,20}$/.test(player)) {
    throw new Response("Некорректно выбран игрок", { status: 400 });
  }
  return transaction(async (client) => {
    const removed = await client.query<{ tournament_id: number }>(
      `DELETE FROM season_round_registrations registration
       USING season_rounds round
       WHERE registration.round_id = $1
         AND registration.player_id = $2
         AND round.id = registration.round_id
       RETURNING round.tournament_id::int`,
      [roundId, player],
    );
    if (!removed.rowCount) {
      throw new Response("Регистрация игрока уже удалена", { status: 404 });
    }
    await client.query(
      `INSERT INTO tournament_audit_log
        (tournament_id, actor_discord_id, action, entity_type, entity_id,
         details)
       VALUES ($1, $2, 'delete', 'season_round_registration', $3,
         $4::jsonb)`,
      [
        removed.rows[0].tournament_id,
        actorDiscordId,
        `${roundId}:${player}`,
        JSON.stringify({ roundId, playerId: player }),
      ],
    );
    return { ok: true };
  });
}
