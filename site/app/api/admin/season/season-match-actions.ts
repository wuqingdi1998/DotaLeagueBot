import { query, transaction } from "@/lib/db";
import { validateSeasonResult } from "@/lib/season";
import { syncSeasonFinalAwards } from "@/lib/season-final-awards";
import { validateSeasonFinalMatch } from "@/lib/season-finals";
import {
  enumValue,
  optionalDate,
  requiredId,
  seasonTeams,
  seasonTierSnapshots,
  textValue,
} from "./season-admin-model";
import { validateSeasonMatchParticipantEligibility } from "./season-match-participant-validation";

const matchStatuses = ["draft", "published", "completed", "cancelled"] as const;
const matchResults = ["team_a", "draw", "team_b"] as const;
const gameWinners = ["a", "draw", "b"] as const;

function matchValues(body: Record<string, unknown>) {
  const status = enumValue(
    body.status ?? "draft",
    matchStatuses,
    "статус матча",
  );
  const result = body.result
    ? enumValue(body.result, matchResults, "результат")
    : null;
  const bestOf = Number(body.bestOf ?? 2);
  if (![1, 2, 3, 5].includes(bestOf)) {
    throw new Response("Формат серии должен быть BO1, BO2, BO3 или BO5", {
      status: 400,
    });
  }
  const teamAScore =
    body.teamAScore === "" || body.teamAScore === null
      ? null
      : Number(body.teamAScore);
  const teamBScore =
    body.teamBScore === "" || body.teamBScore === null
      ? null
      : Number(body.teamBScore);
  if (
    [teamAScore, teamBScore].some(
      (score) => score !== null && (!Number.isInteger(score) || score < 0),
    )
  ) {
    throw new Response("Счёт должен быть целым неотрицательным числом", {
      status: 400,
    });
  }
  if (
    status === "completed" &&
    (!result || teamAScore === null || teamBScore === null)
  ) {
    throw new Response("Для завершённого матча укажите счёт и результат", {
      status: 400,
    });
  }
  const resultError = validateSeasonResult(result, teamAScore, teamBScore);
  if (resultError) {
    throw new Response(resultError, { status: 400 });
  }
  return {
    status,
    result,
    bestOf,
    teamAScore,
    teamBScore,
    scheduledAt: optionalDate(body.scheduledAt),
    teamAName: textValue(body.teamAName, "Команда A", 120),
    teamBName: textValue(body.teamBName, "Команда B", 120),
  };
}

async function replaceParticipants(
  client: import("pg").PoolClient,
  matchId: number,
  tournamentId: number,
  teamA: string[],
  teamB: string[],
  teamACaptainId: string | null,
  teamBCaptainId: string | null,
  submittedTiers: Map<string, number | null>,
) {
  const selected = [...teamA, ...teamB];
  if (selected.length) {
    const players = await client.query<{ discord_id: string }>(
      `SELECT discord_id::text
       FROM players
       WHERE discord_id = ANY($1::bigint[])`,
      [selected],
    );
    if (players.rowCount !== selected.length) {
      throw new Response("Один из выбранных игроков не найден", { status: 400 });
    }
    await validateSeasonMatchParticipantEligibility(client, matchId, selected);
    const repeatedInRound = await client.query<{ player_id: string }>(
      `SELECT DISTINCT participant.player_id::text
       FROM season_match_participants participant
       JOIN season_matches other_match
         ON other_match.id = participant.match_id
       JOIN season_lobbies other_lobby
         ON other_lobby.id = other_match.lobby_id
       JOIN season_matches current_match ON current_match.id = $1
       JOIN season_lobbies current_lobby
         ON current_lobby.id = current_match.lobby_id
       WHERE other_lobby.round_id = current_lobby.round_id
         AND other_match.id <> current_match.id
         AND participant.player_id = ANY($2::bigint[])`,
      [matchId, selected],
    );
    if (repeatedInRound.rowCount) {
      throw new Response(
        "Игрок уже добавлен в другой матч этого тура",
        { status: 400 },
      );
    }
  }
  const previousTierRows = await client.query<{
    player_id: string;
    tier_snapshot: number | null;
  }>(
    `SELECT player_id::text, tier_snapshot::int
     FROM season_match_participants
     WHERE match_id = $1`,
    [matchId],
  );
  const previousTiers = new Map(
    previousTierRows.rows.map((row) => [
      row.player_id,
      row.tier_snapshot,
    ]),
  );
  await client.query(
    "DELETE FROM season_match_participants WHERE match_id = $1",
    [matchId],
  );
  for (const [side, ids] of [["a", teamA], ["b", teamB]] as const) {
    if (!ids.length) continue;
    const captainId = side === "a" ? teamACaptainId : teamBCaptainId;
    const tiers = ids.map((playerId) =>
      submittedTiers.has(playerId)
        ? submittedTiers.get(playerId)
        : previousTiers.get(playerId) ?? null,
    );
    await client.query(
      `INSERT INTO season_match_participants
        (match_id, player_id, team_side, is_captain, tier_snapshot)
       SELECT $1, selected.player_id, $2,
         selected.player_id::text = COALESCE($5::text, ''),
         selected.tier_snapshot
       FROM UNNEST($3::bigint[], $4::smallint[])
         AS selected(player_id, tier_snapshot)`,
      [matchId, side, ids, tiers, captainId],
    );
  }
  if (selected.length) {
    await client.query(
      `INSERT INTO season_participants (tournament_id, player_id)
       SELECT $1, selected.player_id
       FROM UNNEST($2::bigint[]) AS selected(player_id)
       ON CONFLICT (tournament_id, player_id) DO NOTHING`,
      [tournamentId, selected],
    );
  }
}

export async function createSeasonMatch(
  body: Record<string, unknown>,
  actorDiscordId: string,
) {
  const lobbyId = requiredId(body.lobbyId, "лобби");
  const values = matchValues(body);
  const { teamA, teamB } = seasonTeams(body);
  const teamACaptainId = body.teamACaptainId
    ? String(body.teamACaptainId)
    : null;
  const teamBCaptainId = body.teamBCaptainId
    ? String(body.teamBCaptainId)
    : null;
  const tierSnapshots = seasonTierSnapshots(
    body.playerTierSnapshots,
    [...teamA, ...teamB],
  );
  if (
    (teamACaptainId && !teamA.includes(teamACaptainId)) ||
    (teamBCaptainId && !teamB.includes(teamBCaptainId))
  ) {
    throw new Response("Капитан должен входить в состав своей команды", {
      status: 400,
    });
  }
  if (values.status === "completed" && (!teamA.length || !teamB.length)) {
    throw new Response(
      "Для завершённого матча заполните обе команды",
      { status: 400 },
    );
  }
  return transaction(async (client) => {
    const parent = await client.query<{
      tournament_id: number;
      round_kind: "regular" | "finals";
      match_count: number;
    }>(
      `SELECT round.tournament_id::int, round.round_kind,
         (
           SELECT COUNT(*)::int
           FROM season_matches existing_match
           JOIN season_lobbies existing_lobby
             ON existing_lobby.id = existing_match.lobby_id
           WHERE existing_lobby.round_id = round.id
         ) AS match_count
       FROM season_lobbies lobby
       JOIN season_rounds round ON round.id = lobby.round_id
       WHERE lobby.id = $1`,
      [lobbyId],
    );
    if (!parent.rowCount) {
      throw new Response("Лобби не найдено", { status: 404 });
    }
    if (
      parent.rows[0].round_kind === "finals" &&
      parent.rows[0].match_count >= 2
    ) {
      throw new Response("В финальной вкладке должно быть ровно два матча", {
        status: 400,
      });
    }
    const finalError = validateSeasonFinalMatch({
      roundKind: parent.rows[0].round_kind,
      status: values.status,
      result: values.result,
      teamAPlayerIds: teamA,
      teamBPlayerIds: teamB,
    });
    if (finalError) throw new Response(finalError, { status: 400 });
    const created = await client.query<{ id: number }>(
      `INSERT INTO season_matches (
        lobby_id, scheduled_at, team_a_name, team_b_name, best_of,
        team_a_score, team_b_score, result, status, sort_order
       ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        COALESCE((SELECT MAX(sort_order) + 1 FROM season_matches
                  WHERE lobby_id = $1), 1)
       ) RETURNING id::int`,
      [
        lobbyId,
        values.scheduledAt,
        values.teamAName,
        values.teamBName,
        values.bestOf,
        values.teamAScore,
        values.teamBScore,
        values.result,
        values.status,
      ],
    );
    await replaceParticipants(
      client,
      created.rows[0].id,
      parent.rows[0].tournament_id,
      teamA,
      teamB,
      teamACaptainId,
      teamBCaptainId,
      tierSnapshots,
    );
    await syncSeasonFinalAwards(
      client,
      parent.rows[0].tournament_id,
      actorDiscordId,
    );
    return { ok: true, id: created.rows[0].id };
  });
}

export async function updateSeasonMatch(
  body: Record<string, unknown>,
  actorDiscordId: string,
) {
  const id = requiredId(body.id, "матч");
  const values = matchValues(body);
  const { teamA, teamB } = seasonTeams(body);
  const teamACaptainId = body.teamACaptainId
    ? String(body.teamACaptainId)
    : null;
  const teamBCaptainId = body.teamBCaptainId
    ? String(body.teamBCaptainId)
    : null;
  const tierSnapshots = seasonTierSnapshots(
    body.playerTierSnapshots,
    [...teamA, ...teamB],
  );
  if (
    (teamACaptainId && !teamA.includes(teamACaptainId)) ||
    (teamBCaptainId && !teamB.includes(teamBCaptainId))
  ) {
    throw new Response("Капитан должен входить в состав своей команды", {
      status: 400,
    });
  }
  if (values.status === "completed" && (!teamA.length || !teamB.length)) {
    throw new Response(
      "Для завершённого матча заполните обе команды",
      { status: 400 },
    );
  }
  return transaction(async (client) => {
    const updated = await client.query<{
      tournament_id: number;
      round_kind: "regular" | "finals";
    }>(
      `UPDATE season_matches match
       SET scheduled_at = $2, team_a_name = $3, team_b_name = $4,
         best_of = $5, team_a_score = $6, team_b_score = $7,
         result = $8, status = $9, updated_at = NOW()
       FROM season_lobbies lobby, season_rounds round
       WHERE match.id = $1 AND lobby.id = match.lobby_id
         AND round.id = lobby.round_id
       RETURNING round.tournament_id::int, round.round_kind`,
      [
        id,
        values.scheduledAt,
        values.teamAName,
        values.teamBName,
        values.bestOf,
        values.teamAScore,
        values.teamBScore,
        values.result,
        values.status,
      ],
    );
    if (!updated.rowCount) {
      throw new Response("Матч не найден", { status: 404 });
    }
    const finalError = validateSeasonFinalMatch({
      roundKind: updated.rows[0].round_kind,
      status: values.status,
      result: values.result,
      teamAPlayerIds: teamA,
      teamBPlayerIds: teamB,
    });
    if (finalError) throw new Response(finalError, { status: 400 });
    await replaceParticipants(
      client,
      id,
      updated.rows[0].tournament_id,
      teamA,
      teamB,
      teamACaptainId,
      teamBCaptainId,
      tierSnapshots,
    );
    await syncSeasonFinalAwards(
      client,
      updated.rows[0].tournament_id,
      actorDiscordId,
    );
    return { ok: true };
  });
}

export async function deleteSeasonMatch(
  body: Record<string, unknown>,
  actorDiscordId: string,
) {
  const id = requiredId(body.id, "матч");
  return transaction(async (client) => {
    const removed = await client.query<{
      id: number;
      tournament_id: number;
    }>(
      `DELETE FROM season_matches match
       USING season_lobbies lobby, season_rounds round
       WHERE match.id = $1
         AND lobby.id = match.lobby_id
         AND round.id = lobby.round_id
       RETURNING match.id::int, round.tournament_id::int`,
      [id],
    );
    if (!removed.rowCount) {
      throw new Response("Матч не найден", { status: 404 });
    }
    await syncSeasonFinalAwards(
      client,
      removed.rows[0].tournament_id,
      actorDiscordId,
    );
    return { ok: true };
  });
}

function gameValues(body: Record<string, unknown>) {
  const gameNumber = Number(body.gameNumber);
  if (!Number.isInteger(gameNumber) || gameNumber < 1 || gameNumber > 20) {
    throw new Response("Номер карты должен быть от 1 до 20", { status: 400 });
  }
  const dotaMatchId = String(body.dotaMatchId ?? "").trim() || null;
  if (dotaMatchId && !/^\d{1,32}$/.test(dotaMatchId)) {
    throw new Response("Dota 2 Match ID должен содержать только цифры", {
      status: 400,
    });
  }
  const duration =
    body.durationSeconds === "" || body.durationSeconds === null
      ? null
      : Number(body.durationSeconds);
  if (duration !== null && (!Number.isInteger(duration) || duration < 0)) {
    throw new Response("Некорректная длительность карты", { status: 400 });
  }
  return {
    gameNumber,
    dotaMatchId,
    duration,
    winner: body.winnerSide
      ? enumValue(body.winnerSide, gameWinners, "победитель карты")
      : null,
    status: enumValue(
      body.status ?? "draft",
      matchStatuses,
      "статус карты",
    ),
  };
}

export async function createSeasonGame(body: Record<string, unknown>) {
  const matchId = requiredId(body.matchId, "матч");
  const values = gameValues(body);
  const created = await query<{ id: number }>(
    `INSERT INTO season_match_games
      (match_id, game_number, dota_match_id, winner_side,
       duration_seconds, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id::int`,
    [
      matchId,
      values.gameNumber,
      values.dotaMatchId,
      values.winner,
      values.duration,
      values.status,
    ],
  );
  return { ok: true, id: created[0].id };
}

export async function updateSeasonGame(body: Record<string, unknown>) {
  const id = requiredId(body.id, "карта");
  const values = gameValues(body);
  const updated = await query<{ id: number }>(
    `UPDATE season_match_games
     SET game_number = $2, dota_match_id = $3, winner_side = $4,
       duration_seconds = $5, status = $6, updated_at = NOW()
     WHERE id = $1 RETURNING id::int`,
    [
      id,
      values.gameNumber,
      values.dotaMatchId,
      values.winner,
      values.duration,
      values.status,
    ],
  );
  if (!updated.length) throw new Response("Карта не найдена", { status: 404 });
  return { ok: true };
}

export async function deleteSeasonGame(body: Record<string, unknown>) {
  const id = requiredId(body.id, "карта");
  const removed = await query<{ id: number }>(
    "DELETE FROM season_match_games WHERE id = $1 RETURNING id::int",
    [id],
  );
  if (!removed.length) throw new Response("Карта не найдена", { status: 404 });
  return { ok: true };
}
