import { transaction } from "@/lib/db";
import {
  enumValue,
  requiredId,
  textValue,
} from "./season-admin-model";
import {
  addSeasonParticipant,
  resolveSeasonPlayer,
} from "./season-admin-player";

const standingsSections = ["active", "inactive"] as const;

function adjustmentAmount(value: unknown) {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 99) {
    throw new Response("Корректировка p должна быть целым числом от −99 до 99", {
      status: 400,
    });
  }
  return amount;
}

function fireCount(value: unknown) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0 || count > 100) {
    throw new Response("Количество огоньков должно быть от 0 до 100", {
      status: 400,
    });
  }
  return count;
}

export async function updateSeasonParticipant(
  body: Record<string, unknown>,
) {
  const tournamentId = requiredId(body.tournamentId, "турнир");
  const section = enumValue(
    body.section,
    standingsSections,
    "раздел таблицы",
  );
  return transaction(async (client) => {
    const player = await resolveSeasonPlayer(client, body.playerId);
    await addSeasonParticipant(client, tournamentId, player.discord_id);
    await client.query(
      `UPDATE season_participants
       SET standings_section = $3, inactive_reason = $4
       WHERE tournament_id = $1 AND player_id = $2`,
      [
        tournamentId,
        player.discord_id,
        section,
        section === "inactive"
          ? textValue(body.inactiveReason, "Перенесён организатором", 240)
          : null,
      ],
    );
    return { ok: true };
  });
}

export async function createSeasonAdjustment(
  body: Record<string, unknown>,
) {
  const tournamentId = requiredId(body.tournamentId, "турнир");
  const roundId = body.roundId
    ? requiredId(body.roundId, "тур")
    : null;
  return transaction(async (client) => {
    const player = await resolveSeasonPlayer(client, body.playerId);
    await addSeasonParticipant(client, tournamentId, player.discord_id);
    const created = await client.query<{ id: number }>(
      `INSERT INTO season_point_adjustments
        (tournament_id, player_id, round_id, amount, reason)
       SELECT $1, $2, round.id, $4, $5
       FROM (SELECT $3::bigint AS id) round
       WHERE $3::bigint IS NULL OR EXISTS (
         SELECT 1 FROM season_rounds owned_round
         WHERE owned_round.id = $3 AND owned_round.tournament_id = $1
       )
       RETURNING id::int`,
      [
        tournamentId,
        player.discord_id,
        roundId,
        adjustmentAmount(body.amount),
        textValue(body.reason, "Ручная корректировка p", 240),
      ],
    );
    if (!created.rowCount) {
      throw new Response("Тур не относится к выбранному сезону", {
        status: 400,
      });
    }
    return { ok: true, id: created.rows[0].id };
  });
}

export async function updateSeasonAdjustment(
  body: Record<string, unknown>,
) {
  const id = requiredId(body.id, "корректировка p");
  return transaction(async (client) => {
    const player = await resolveSeasonPlayer(client, body.playerId);
    const updated = await client.query<{ tournament_id: number }>(
      `UPDATE season_point_adjustments
       SET player_id = $2, amount = $3, reason = $4, updated_at = NOW()
       WHERE id = $1 RETURNING tournament_id::int`,
      [
        id,
        player.discord_id,
        adjustmentAmount(body.amount),
        textValue(body.reason, "Ручная корректировка p", 240),
      ],
    );
    if (!updated.rowCount) {
      throw new Response("Корректировка p не найдена", { status: 404 });
    }
    await addSeasonParticipant(
      client,
      updated.rows[0].tournament_id,
      player.discord_id,
    );
    return { ok: true };
  });
}

export async function deleteSeasonAdjustment(
  body: Record<string, unknown>,
) {
  const id = requiredId(body.id, "корректировка p");
  return transaction(async (client) => {
    const removed = await client.query(
      "DELETE FROM season_point_adjustments WHERE id = $1 RETURNING id",
      [id],
    );
    if (!removed.rowCount) {
      throw new Response("Корректировка p не найдена", { status: 404 });
    }
    return { ok: true };
  });
}

export async function saveSeasonPenalty(body: Record<string, unknown>) {
  const tournamentId = requiredId(body.tournamentId, "турнир");
  const roundId = requiredId(body.roundId, "тур");
  return transaction(async (client) => {
    const player = await resolveSeasonPlayer(client, body.playerId);
    await addSeasonParticipant(client, tournamentId, player.discord_id);
    const saved = await client.query<{ id: number }>(
      `INSERT INTO season_penalty_events
        (tournament_id, player_id, round_id, fire_count, note)
       SELECT $1, $2, round.id, $4, $5
       FROM season_rounds round
       WHERE round.id = $3 AND round.tournament_id = $1
         AND round.round_kind = 'regular'
       ON CONFLICT (tournament_id, player_id, round_id)
       DO UPDATE SET fire_count = EXCLUDED.fire_count,
         note = EXCLUDED.note, updated_at = NOW()
       RETURNING id::int`,
      [
        tournamentId,
        player.discord_id,
        roundId,
        fireCount(body.fireCount),
        textValue(body.note, "", 240) || null,
      ],
    );
    if (!saved.rowCount) {
      throw new Response("Выбранный тур не найден", { status: 404 });
    }
    return { ok: true, id: saved.rows[0].id };
  });
}

export async function deleteSeasonPenalty(body: Record<string, unknown>) {
  const id = requiredId(body.id, "штраф");
  return transaction(async (client) => {
    const removed = await client.query(
      "DELETE FROM season_penalty_events WHERE id = $1 RETURNING id",
      [id],
    );
    if (!removed.rowCount) {
      throw new Response("Штраф не найден", { status: 404 });
    }
    return { ok: true };
  });
}
