import { query, transaction } from "@/lib/db";
import {
  enumValue,
  optionalDate,
  requiredId,
  seasonRoundCount,
  textValue,
} from "./season-admin-model";

const roundStatuses = ["planned", "active", "completed", "cancelled"] as const;
const lobbyStatuses = [
  "draft",
  "scheduled",
  "live",
  "completed",
  "cancelled",
] as const;

export async function resizeSeason(
  body: Record<string, unknown>,
  actorDiscordId: string,
) {
  const tournamentId = requiredId(body.tournamentId, "турнир");
  const count = seasonRoundCount(body.roundCount);
  const confirmDelete = body.confirmDelete === true;

  return transaction(async (client) => {
    const tournament = await client.query<{ season_round_count: number }>(
      `SELECT season_round_count::int
       FROM tournaments
       WHERE id = $1 AND tournament_type = 'seasonal'
       FOR UPDATE`,
      [tournamentId],
    );
    if (!tournament.rowCount) {
      throw new Response("Сезонный турнир не найден", { status: 404 });
    }
    const currentCount = tournament.rows[0].season_round_count;
    if (count < currentCount) {
      const populated = await client.query<{ has_data: boolean }>(
        `SELECT EXISTS (
           SELECT 1
           FROM season_rounds round
           LEFT JOIN season_lobbies lobby ON lobby.round_id = round.id
           LEFT JOIN season_matches match ON match.lobby_id = lobby.id
           LEFT JOIN season_match_games game ON game.match_id = match.id
           WHERE round.tournament_id = $1
             AND round.round_kind = 'regular'
             AND round.round_number > $2
             AND (lobby.id IS NOT NULL OR match.id IS NOT NULL OR game.id IS NOT NULL)
         ) AS has_data`,
        [tournamentId, count],
      );
      if (populated.rows[0].has_data && !confirmDelete) {
        return { requiresConfirmation: true };
      }
    }
    await client.query(
      `UPDATE season_rounds
       SET round_number = 101
       WHERE tournament_id = $1 AND round_kind = 'finals'`,
      [tournamentId],
    );
    if (count < currentCount) {
      await client.query(
        `DELETE FROM season_rounds
         WHERE tournament_id = $1
           AND round_kind = 'regular'
           AND round_number > $2`,
        [tournamentId, count],
      );
    } else if (count > currentCount) {
      await client.query(
        `INSERT INTO season_rounds
          (tournament_id, round_number, round_kind)
         SELECT $1, number, 'regular'
         FROM generate_series($2::int + 1, $3::int) AS number
         ON CONFLICT (tournament_id, round_number) DO NOTHING`,
        [tournamentId, currentCount, count],
      );
    }
    await client.query(
      `UPDATE season_rounds
       SET round_number = $2::int + 1
       WHERE tournament_id = $1 AND round_kind = 'finals'`,
      [tournamentId, count],
    );
    await client.query(
      `UPDATE tournaments
       SET season_round_count = $2, updated_at = NOW()
       WHERE id = $1`,
      [tournamentId, count],
    );
    await client.query(
      `INSERT INTO tournament_audit_log
        (tournament_id, actor_discord_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'resize', 'season', $1::text, $3::jsonb)`,
      [tournamentId, actorDiscordId, JSON.stringify({ from: currentCount, to: count })],
    );
    return { ok: true };
  });
}

export async function updateSeasonRound(
  body: Record<string, unknown>,
  actorDiscordId: string,
) {
  const id = requiredId(body.id, "тур");
  const isVisible = body.isVisible === true;
  const roundState = await query<{
    is_visible: boolean;
    count: number;
    round_kind: "regular" | "finals";
  }>(
    `SELECT round.is_visible, round.round_kind,
       COUNT(match.id) FILTER (WHERE match.status = 'completed')::int AS count
     FROM season_rounds round
     LEFT JOIN season_lobbies lobby ON lobby.round_id = round.id
     LEFT JOIN season_matches match ON match.lobby_id = lobby.id
     WHERE round.id = $1
     GROUP BY round.id`,
    [id],
  );
  if (!roundState.length) {
    throw new Response("Тур не найден", { status: 404 });
  }
  const status = roundState[0].round_kind === "finals"
    ? enumValue(body.status, roundStatuses, "статус финалов")
    : "planned";
  if (
    status === "completed" &&
    roundState[0].round_kind === "finals" &&
    roundState[0].count !== 2
  ) {
    throw new Response(
      "Финальный этап можно завершить после двух завершённых матчей",
      { status: 400 },
    );
  }
  if (isVisible && body.confirmEmpty !== true) {
    if (
      !roundState[0].is_visible &&
      roundState[0].count === 0
    ) {
      return { requiresConfirmation: true };
    }
  }
  const updated = await query<{ tournament_id: number }>(
    `UPDATE season_rounds
     SET name = $2, scheduled_at = $3,
       status = CASE WHEN round_kind = 'regular'
         THEN season_round_status_at($3, status)
         ELSE $4
       END,
       is_visible = $5, updated_at = NOW()
     WHERE id = $1
     RETURNING tournament_id::int`,
    [
      id,
      textValue(body.name, "", 160) || null,
      optionalDate(body.scheduledAt),
      status,
      isVisible,
    ],
  );
  if (!updated.length) {
    throw new Response("Тур не найден", { status: 404 });
  }
  await query(
    `INSERT INTO tournament_audit_log
      (tournament_id, actor_discord_id, action, entity_type, entity_id)
     VALUES ($1, $2, 'update', 'season_round', $3)`,
    [updated[0].tournament_id, actorDiscordId, String(id)],
  );
  return { ok: true };
}

export async function createSeasonLobby(body: Record<string, unknown>) {
  const roundId = requiredId(body.roundId, "тур");
  const status = enumValue(
    body.status ?? "draft",
    lobbyStatuses,
    "статус лобби",
  );
  const created = await query<{ id: number }>(
    `INSERT INTO season_lobbies
      (round_id, name, sort_order, status, scheduled_at)
     SELECT round.id, $2,
       COALESCE((SELECT MAX(sort_order) + 1 FROM season_lobbies
                 WHERE round_id = round.id), 1),
       $3, $4
     FROM season_rounds round
     JOIN tournaments tournament ON tournament.id = round.tournament_id
     WHERE round.id = $1 AND tournament.tournament_type = 'seasonal'
     RETURNING id::int`,
    [
      roundId,
      textValue(body.name, "Новое лобби"),
      status,
      optionalDate(body.scheduledAt),
    ],
  );
  if (!created.length) {
    throw new Response("Тур не найден", { status: 404 });
  }
  return { ok: true, id: created[0].id };
}

export async function updateSeasonLobby(body: Record<string, unknown>) {
  const id = requiredId(body.id, "лобби");
  const status = enumValue(body.status, lobbyStatuses, "статус лобби");
  const updated = await query<{ id: number }>(
    `UPDATE season_lobbies
     SET name = $2, status = $3, scheduled_at = $4, updated_at = NOW()
     WHERE id = $1 RETURNING id::int`,
    [
      id,
      textValue(body.name, "Лобби"),
      status,
      optionalDate(body.scheduledAt),
    ],
  );
  if (!updated.length) {
    throw new Response("Лобби не найдено", { status: 404 });
  }
  return { ok: true };
}

export async function deleteSeasonLobby(body: Record<string, unknown>) {
  const id = requiredId(body.id, "лобби");
  const removed = await query<{ id: number }>(
    "DELETE FROM season_lobbies WHERE id = $1 RETURNING id::int",
    [id],
  );
  if (!removed.length) {
    throw new Response("Лобби не найдено", { status: 404 });
  }
  return { ok: true };
}
