import { transaction } from "@/lib/db";
import { requiredId, textValue } from "./season-admin-model";
import {
  addSeasonParticipant,
  resolveSeasonPlayer,
} from "./season-admin-player";

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
    team_side: "a" | "b";
  }>(
    `SELECT round.tournament_id::int, participant.team_side
     FROM season_matches match
     JOIN season_lobbies lobby ON lobby.id = match.lobby_id
     JOIN season_rounds round ON round.id = lobby.round_id
     JOIN season_match_participants participant
       ON participant.match_id = match.id
      AND participant.player_id = $2
     WHERE match.id = $1
       AND (
         $3::bigint IS NULL
         OR EXISTS (
           SELECT 1 FROM season_match_games game
           WHERE game.id = $3 AND game.match_id = match.id
         )
       )`,
    [matchId, outgoing.discord_id, gameId],
  );
  if (!parent.rowCount) {
    throw new Response(
      "Матч, карта или заменяемый игрок не соответствуют друг другу",
      { status: 400 },
    );
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
  if (!gameId) {
    const alreadyReplacing = await client.query(
      `SELECT 1 FROM season_match_substitutions
       WHERE match_id = $1 AND incoming_player_id = $2
         AND game_id IS NULL AND id <> COALESCE($3, 0)
       LIMIT 1`,
      [matchId, incoming.discord_id, excludedSubstitutionId],
    );
    if (alreadyReplacing.rowCount) {
      throw new Response(
        "Этот игрок уже заменяет другого участника всего матча",
        { status: 409 },
      );
    }
  }
  return {
    matchId,
    gameId,
    outgoing,
    incoming,
    tournamentId: parent.rows[0].tournament_id,
    teamSide: parent.rows[0].team_side,
    technicalLoss: body.technicalLoss !== false,
    note: textValue(body.note, "", 240) || null,
  };
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
    const created = await client.query<{ id: number }>(
      `INSERT INTO season_match_substitutions
        (match_id, game_id, outgoing_player_id, incoming_player_id,
         team_side, technical_loss, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id::int`,
      [
        values.matchId,
        values.gameId,
        values.outgoing.discord_id,
        values.incoming.discord_id,
        values.teamSide,
        values.technicalLoss,
        values.note,
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
    const values = await substitutionValues(client, body, id);
    await addSeasonParticipant(
      client,
      values.tournamentId,
      values.incoming.discord_id,
    );
    const updated = await client.query(
      `UPDATE season_match_substitutions
       SET match_id = $2, game_id = $3, outgoing_player_id = $4,
         incoming_player_id = $5, team_side = $6, technical_loss = $7,
         note = $8, updated_at = NOW()
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
      "DELETE FROM season_match_substitutions WHERE id = $1 RETURNING id",
      [id],
    );
    if (!removed.rowCount) {
      throw new Response("Замена не найдена", { status: 404 });
    }
    return { ok: true };
  });
}
