import { transaction } from "@/lib/db";
import { requiredId, textValue } from "./season-admin-model";
import {
  addSeasonParticipant,
  resolveSeasonPlayer,
} from "./season-admin-player";

const secondMapSubstitutionPenaltyFires = 5;

function optionalId(value: unknown, label: string) {
  return value ? requiredId(value, label) : null;
}

async function substitutionValues(
  client: import("pg").PoolClient,
  body: Record<string, unknown>,
  excludedSubstitutionId: number | null = null,
) {
  const matchId = requiredId(body.matchId, "матч");
  const gameId = optionalId(body.gameId, "карта");
  const outgoing = await resolveSeasonPlayer(client, body.outgoingPlayerId);
  const incoming = await resolveSeasonPlayer(client, body.incomingPlayerId);
  if (outgoing.discord_id === incoming.discord_id) {
    throw new Response("Заменяемый игрок и игрок замены должны отличаться", {
      status: 400,
    });
  }
  const parent = await client.query<{
    tournament_id: number;
    round_id: number;
    team_side: "a" | "b";
    game_number: number | null;
  }>(
    `SELECT round.tournament_id::int, round.id::int AS round_id,
       participant.team_side, game.game_number::int
     FROM season_matches match
     JOIN season_lobbies lobby ON lobby.id = match.lobby_id
     JOIN season_rounds round ON round.id = lobby.round_id
     JOIN season_match_participants participant
       ON participant.match_id = match.id
      AND participant.player_id = $2
     LEFT JOIN season_match_games game
       ON game.id = $3 AND game.match_id = match.id
     WHERE match.id = $1
       AND ($3::bigint IS NULL OR game.id IS NOT NULL)`,
    [matchId, outgoing.discord_id, gameId],
  );
  if (!parent.rowCount) {
    throw new Response(
      "Матч, карта или заменяемый игрок не соответствуют друг другу",
      { status: 400 },
    );
  }
  if (parent.rows[0].game_number !== null && parent.rows[0].game_number !== 2) {
    throw new Response("Замена по ходу матча допускается только на второй карте", {
      status: 400,
    });
  }
  const alreadyPlaying = await client.query(
    `SELECT 1 FROM season_match_participants
     WHERE match_id = $1 AND player_id = $2`,
    [matchId, incoming.discord_id],
  );
  if (alreadyPlaying.rowCount) {
    throw new Response("Игрок замены уже находится в составе этого матча", {
      status: 400,
    });
  }
  const conflictingSubstitution = await client.query(
    `SELECT 1 FROM season_match_substitutions
     WHERE match_id = $1 AND id <> COALESCE($4, 0)
       AND (outgoing_player_id = $2 OR incoming_player_id = $3)
     LIMIT 1`,
    [
      matchId,
      outgoing.discord_id,
      incoming.discord_id,
      excludedSubstitutionId,
    ],
  );
  if (conflictingSubstitution.rowCount) {
    throw new Response(
      "Для выбранного выбывшего игрока или игрока замены уже есть запись",
      { status: 409 },
    );
  }
  return {
    matchId,
    gameId,
    outgoing,
    incoming,
    tournamentId: parent.rows[0].tournament_id,
    roundId: parent.rows[0].round_id,
    teamSide: parent.rows[0].team_side,
    technicalLoss: parent.rows[0].game_number === 2,
    penaltyFires:
      parent.rows[0].game_number === 2
        ? secondMapSubstitutionPenaltyFires
        : 0,
    note: textValue(body.note, "", 240) || null,
  };
}

async function addSubstitutionPenalty(
  client: import("pg").PoolClient,
  values: Awaited<ReturnType<typeof substitutionValues>>,
) {
  if (!values.penaltyFires) return null;
  const event = await client.query<{ id: number }>(
    `INSERT INTO season_penalty_events
      (tournament_id, player_id, round_id, fire_count, note)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tournament_id, player_id, round_id)
     DO UPDATE SET
       fire_count = season_penalty_events.fire_count + EXCLUDED.fire_count,
       note = COALESCE(season_penalty_events.note, EXCLUDED.note),
       updated_at = NOW()
     RETURNING id::int`,
    [
      values.tournamentId,
      values.outgoing.discord_id,
      values.roundId,
      values.penaltyFires,
      "Замена игрока на второй карте",
    ],
  );
  return event.rows[0].id;
}

async function removeSubstitutionPenalty(
  client: import("pg").PoolClient,
  penaltyEventId: number | null,
  penaltyFires: number,
) {
  if (!penaltyEventId || !penaltyFires) return;
  await client.query(
    `UPDATE season_penalty_events
     SET fire_count = GREATEST(0, fire_count - $2), updated_at = NOW()
     WHERE id = $1`,
    [penaltyEventId, penaltyFires],
  );
  await client.query(
    "DELETE FROM season_penalty_events WHERE id = $1 AND fire_count = 0",
    [penaltyEventId],
  );
}

export async function createSeasonSubstitution(
  body: Record<string, unknown>,
) {
  return transaction(async (client) => {
    const values = await substitutionValues(client, body);
    await addSeasonParticipant(
      client,
      values.tournamentId,
      values.incoming.discord_id,
    );
    const penaltyEventId = await addSubstitutionPenalty(client, values);
    const created = await client.query<{ id: number }>(
      `INSERT INTO season_match_substitutions
        (match_id, game_id, outgoing_player_id, incoming_player_id,
         team_side, technical_loss, note, penalty_event_id,
         penalty_fire_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id::int`,
      [
        values.matchId,
        values.gameId,
        values.outgoing.discord_id,
        values.incoming.discord_id,
        values.teamSide,
        values.technicalLoss,
        values.note,
        penaltyEventId,
        values.penaltyFires,
      ],
    );
    return { ok: true, id: created.rows[0].id };
  });
}

export async function updateSeasonSubstitution(
  body: Record<string, unknown>,
) {
  const id = requiredId(body.id, "замена");
  return transaction(async (client) => {
    const existing = await client.query<{
      penalty_event_id: number | null;
      penalty_fire_count: number;
    }>(
      `SELECT penalty_event_id::int, penalty_fire_count::int
       FROM season_match_substitutions WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!existing.rowCount) {
      throw new Response("Замена не найдена", { status: 404 });
    }
    const values = await substitutionValues(client, body, id);
    await addSeasonParticipant(
      client,
      values.tournamentId,
      values.incoming.discord_id,
    );
    await removeSubstitutionPenalty(
      client,
      existing.rows[0].penalty_event_id,
      existing.rows[0].penalty_fire_count,
    );
    const penaltyEventId = await addSubstitutionPenalty(client, values);
    const updated = await client.query(
      `UPDATE season_match_substitutions
       SET match_id = $2, game_id = $3, outgoing_player_id = $4,
         incoming_player_id = $5, team_side = $6, technical_loss = $7,
         note = $8, penalty_event_id = $9, penalty_fire_count = $10,
         updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [
        id,
        values.matchId,
        values.gameId,
        values.outgoing.discord_id,
        values.incoming.discord_id,
        values.teamSide,
        values.technicalLoss,
        values.note,
        penaltyEventId,
        values.penaltyFires,
      ],
    );
    if (!updated.rowCount) {
      throw new Response("Замена не найдена", { status: 404 });
    }
    return { ok: true };
  });
}

export async function deleteSeasonSubstitution(
  body: Record<string, unknown>,
) {
  const id = requiredId(body.id, "замена");
  return transaction(async (client) => {
    const removed = await client.query(
      `DELETE FROM season_match_substitutions WHERE id = $1
       RETURNING id, penalty_event_id::int, penalty_fire_count::int`,
      [id],
    );
    if (!removed.rowCount) {
      throw new Response("Замена не найдена", { status: 404 });
    }
    await removeSubstitutionPenalty(
      client,
      removed.rows[0].penalty_event_id,
      removed.rows[0].penalty_fire_count,
    );
    return { ok: true };
  });
}
