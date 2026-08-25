import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { query, transaction } from "@/lib/db";
import { validateFinishedMatchScore } from "@/lib/match-validation";
import { moscowDateTimeInputToIso } from "@/lib/moscow-date-time";

type MatchBody = {
  id?: number;
  tournamentId?: number;
  groupId?: number | null;
  scheduledAt?: string;
  stage?: string;
  teamAId?: number | null;
  teamBId?: number | null;
  teamAPlaceholder?: string | null;
  teamBPlaceholder?: string | null;
  teamAScore?: number | null;
  teamBScore?: number | null;
  bestOf?: number;
  status?: string;
  sortOrder?: number;
  resultType?: "normal" | "technical" | "forfeit" | "cancelled";
  teamAResultLabel?: string | null;
  teamBResultLabel?: string | null;
  decisionNote?: string | null;
  bracketRound?: number | null;
  bracketSide?: "group" | "upper" | "lower" | "grand_final" | null;
  bracketSlot?: number | null;
  winnerToMatchId?: number | null;
  winnerToSlot?: "a" | "b" | null;
  loserToMatchId?: number | null;
  loserToSlot?: "a" | "b" | null;
  eliminatedTeamId?: number | null;
};

function normalizeScheduledAt(body: MatchBody): boolean {
  if (body.scheduledAt === undefined) return true;
  const normalized = moscowDateTimeInputToIso(body.scheduledAt);
  if (!normalized) return false;
  body.scheduledAt = normalized;
  return true;
}

function validMatch(body: MatchBody): string {
  if (!body.tournamentId || !body.scheduledAt || !body.stage?.trim()) {
    return "Заполните турнир, этап и время матча";
  }
  if (!body.teamAId && !body.teamAPlaceholder?.trim()) {
    return "Укажите первую команду или подпись-заполнитель";
  }
  if (!body.teamBId && !body.teamBPlaceholder?.trim()) {
    return "Укажите вторую команду или подпись-заполнитель";
  }
  if (![1, 2, 3, 5].includes(Number(body.bestOf))) {
    return "Формат серии должен быть BO1, BO2, BO3 или BO5";
  }
  if (Number.isNaN(Date.parse(body.scheduledAt))) {
    return "Укажите корректные дату и время матча";
  }
  if (body.stage.trim().length > 100) {
    return "Название этапа не может быть длиннее 100 символов";
  }
  if (
    (body.teamAPlaceholder?.trim().length ?? 0) > 100 ||
    (body.teamBPlaceholder?.trim().length ?? 0) > 100
  ) {
    return "Название команды или заполнителя не может быть длиннее 100 символов";
  }
  for (const id of [
    body.tournamentId,
    body.groupId,
    body.teamAId,
    body.teamBId,
  ]) {
    if (id !== null && id !== undefined && !Number.isInteger(id)) {
      return "Некорректно выбран турнир или команда";
    }
  }
  if (body.teamAId && body.teamAId === body.teamBId) {
    return "Команда не может играть сама с собой";
  }
  return "";
}

async function referencesBelongToTournament(body: MatchBody) {
  const rows = await query<{ valid: boolean }>(
    `SELECT
       EXISTS (SELECT 1 FROM tournaments WHERE id = $1)
       AND (
         $2::bigint IS NULL OR EXISTS (
           SELECT 1 FROM tournament_groups
           WHERE id = $2 AND tournament_id = $1
         )
       )
       AND (
         $3::bigint IS NULL OR EXISTS (
           SELECT 1 FROM tournament_team_applications
           WHERE id = $3 AND tournament_id = $1
         )
       )
       AND (
         $4::bigint IS NULL OR EXISTS (
           SELECT 1 FROM tournament_team_applications
           WHERE id = $4 AND tournament_id = $1
         )
       ) AS valid`,
    [
      body.tournamentId,
      body.groupId ?? null,
      body.teamAId ?? null,
      body.teamBId ?? null,
    ],
  );
  return rows[0]?.valid === true;
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as MatchBody;
    if (!normalizeScheduledAt(body)) {
      return Response.json(
        { error: "Укажите корректные дату и время матча" },
        { status: 400 },
      );
    }
    const validationError = validMatch(body);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }
    if (!(await referencesBelongToTournament(body))) {
      return Response.json(
        { error: "Группа и команды должны относиться к выбранному турниру" },
        { status: 400 },
      );
    }
    const created = await transaction(async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock(71003, $1::int)",
        [body.tournamentId],
      );
      const existing = await client.query<{ id: number }>(
        `SELECT id::int
         FROM tournament_matches
         WHERE tournament_id = $1
           AND group_id IS NOT DISTINCT FROM $2::bigint
           AND scheduled_at = $3
           AND stage = $4
           AND team_a_application_id IS NOT DISTINCT FROM $5::bigint
           AND team_b_application_id IS NOT DISTINCT FROM $6::bigint
           AND team_a_placeholder IS NOT DISTINCT FROM $7
           AND team_b_placeholder IS NOT DISTINCT FROM $8
           AND best_of = $9
           AND sort_order = $10
           AND bracket_round IS NOT DISTINCT FROM $11::int
           AND bracket_side IS NOT DISTINCT FROM $12
           AND bracket_slot IS NOT DISTINCT FROM $13::int
         LIMIT 1`,
        [
          body.tournamentId,
          body.groupId ?? null,
          body.scheduledAt,
          body.stage?.trim(),
          body.teamAId ?? null,
          body.teamBId ?? null,
          body.teamAPlaceholder?.trim() || null,
          body.teamBPlaceholder?.trim() || null,
          body.bestOf,
          body.sortOrder ?? 0,
          body.bracketRound ?? null,
          body.bracketSide ?? null,
          body.bracketSlot ?? null,
        ],
      );
      if (existing.rowCount) {
        return { id: existing.rows[0].id, isExisting: true };
      }
      const result = await client.query<{ id: number }>(
        `INSERT INTO tournament_matches (
          tournament_id, group_id, scheduled_at, stage,
          team_a_application_id, team_b_application_id,
          team_a_placeholder, team_b_placeholder, best_of, sort_order,
          result_type, bracket_round, bracket_side, bracket_slot
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING id::int`,
        [
          body.tournamentId,
          body.groupId ?? null,
          body.scheduledAt,
          body.stage?.trim(),
          body.teamAId ?? null,
          body.teamBId ?? null,
          body.teamAPlaceholder?.trim() || null,
          body.teamBPlaceholder?.trim() || null,
          body.bestOf,
          body.sortOrder ?? 0,
          body.resultType ?? "normal",
          body.bracketRound ?? null,
          body.bracketSide ?? null,
          body.bracketSlot ?? null,
        ],
      );
      const id = result.rows[0].id;
      await client.query(
        `INSERT INTO tournament_audit_log
          (tournament_id, actor_discord_id, action, entity_type, entity_id)
         VALUES ($1, $2, 'create', 'match', $3)`,
        [body.tournamentId, admin.discordId, String(id)],
      );
      return { id, isExisting: false };
    });
    return Response.json(
      { ok: true, id: created.id },
      { status: created.isExisting ? 200 : 201 },
    );
  } catch (error) {
    return responseFromAuthError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as MatchBody;
    if (!normalizeScheduledAt(body)) {
      return Response.json(
        { error: "Укажите корректные дату и время матча" },
        { status: 400 },
      );
    }
    if (!body.id || !body.status) {
      return Response.json(
        { error: "Не указан матч или статус" },
        { status: 400 },
      );
    }
    const fullMatchUpdate = Boolean(
      body.tournamentId && body.scheduledAt && body.stage?.trim() && body.bestOf,
    );
    if (fullMatchUpdate) {
      const validationError = validMatch(body);
      if (validationError) {
        return Response.json({ error: validationError }, { status: 400 });
      }
    }
    const allowedStatuses = [
      "scheduled",
      "ready",
      "live",
      "finished",
      "cancelled",
    ];
    if (!allowedStatuses.includes(body.status)) {
      return Response.json({ error: "Некорректный статус" }, { status: 400 });
    }
    const allowedResultTypes = ["normal", "technical", "forfeit", "cancelled"];
    if (!allowedResultTypes.includes(body.resultType ?? "normal")) {
      return Response.json({ error: "Некорректный тип результата" }, { status: 400 });
    }
    const currentMatchRows = await query<{
      tournament_id: number;
      best_of: number;
    }>(
      `SELECT tournament_id::int, best_of::int
       FROM tournament_matches
       WHERE id = $1`,
      [body.id],
    );
    if (!currentMatchRows.length) {
      return Response.json({ error: "Матч не найден" }, { status: 404 });
    }
    if (
      fullMatchUpdate &&
      (body.tournamentId !== currentMatchRows[0].tournament_id ||
        !(await referencesBelongToTournament(body)))
    ) {
      return Response.json(
        { error: "Группа и команды должны относиться к выбранному турниру" },
        { status: 400 },
      );
    }
    for (const [targetId, targetSlot] of [
      [body.winnerToMatchId, body.winnerToSlot],
      [body.loserToMatchId, body.loserToSlot],
    ] as const) {
      if ((targetId && !targetSlot) || (!targetId && targetSlot)) {
        return Response.json(
          { error: "Для связи сетки укажите и следующий матч, и сторону A/B" },
          { status: 400 },
        );
      }
      if (targetId === body.id) {
        return Response.json(
          { error: "Матч нельзя связать с самим собой" },
          { status: 400 },
        );
      }
    }
    const linkedMatchIds = [
      body.winnerToMatchId,
      body.loserToMatchId,
    ].filter((value): value is number => Boolean(value));
    if (linkedMatchIds.length) {
      const linkedMatches = await query<{
        id: number;
        tournament_id: number;
      }>(
        `SELECT id::int, tournament_id::int
         FROM tournament_matches
         WHERE id = ANY($1::bigint[])
            OR id = $2`,
        [linkedMatchIds, body.id],
      );
      const source = linkedMatches.find((match) => match.id === body.id);
      const validTargets = new Set(
        linkedMatches
          .filter(
            (match) =>
              match.id !== body.id &&
              match.tournament_id === source?.tournament_id,
          )
          .map((match) => match.id),
      );
      if (
        !source ||
        linkedMatchIds.some((targetId) => !validTargets.has(targetId))
      ) {
        return Response.json(
          { error: "Связанные матчи должны находиться в этом же турнире" },
          { status: 400 },
        );
      }
    }
    const scoreError =
      body.status === "finished" &&
      (body.resultType ?? "normal") === "normal"
        ? validateFinishedMatchScore(
            body.teamAScore,
            body.teamBScore,
            fullMatchUpdate ? body.bestOf : currentMatchRows[0].best_of,
          )
        : "";
    if (scoreError) {
      return Response.json(
        { error: scoreError },
        { status: 400 },
      );
    }
    if (
      body.status === "finished" &&
      (body.resultType ?? "normal") !== "normal" &&
      (!body.teamAResultLabel?.trim() || !body.teamBResultLabel?.trim())
    ) {
      return Response.json(
        { error: "Для технического результата укажите обозначения обеих команд" },
        { status: 400 },
      );
    }
    if (
      body.eliminatedTeamId !== null &&
      body.eliminatedTeamId !== undefined
    ) {
      if (!Number.isInteger(body.eliminatedTeamId)) {
        return Response.json(
          { error: "Некорректно выбрана выбывшая команда" },
          { status: 400 },
        );
      }
      const sourceMatch = await query<{
        team_a_application_id: number | null;
        team_b_application_id: number | null;
        bracket_side: string | null;
      }>(
        `SELECT team_a_application_id::int, team_b_application_id::int,
           bracket_side
         FROM tournament_matches
         WHERE id = $1`,
        [body.id],
      );
      if (
        !sourceMatch.length ||
        !(fullMatchUpdate
          ? body.bracketSide
          : sourceMatch[0].bracket_side) ||
        (fullMatchUpdate
          ? body.bracketSide
          : sourceMatch[0].bracket_side) === "group" ||
        ![
          fullMatchUpdate
            ? body.teamAId
            : sourceMatch[0].team_a_application_id,
          fullMatchUpdate
            ? body.teamBId
            : sourceMatch[0].team_b_application_id,
        ].includes(body.eliminatedTeamId)
      ) {
        return Response.json(
          { error: "Выбывшая команда должна участвовать в этом матче" },
          { status: 400 },
        );
      }
    }
    const updated = await query<{ tournament_id: number }>(
      `UPDATE tournament_matches
       SET team_a_score = $1, team_b_score = $2, status = $3,
         result_type = $4, team_a_result_label = $5,
         team_b_result_label = $6, decision_note = $7,
         bracket_round = $8, bracket_side = $9, bracket_slot = $10,
         winner_to_match_id = $11, winner_to_slot = $12,
         loser_to_match_id = $13, loser_to_slot = $14,
         group_id = CASE WHEN $15 THEN $16 ELSE group_id END,
         scheduled_at = CASE WHEN $15 THEN $17 ELSE scheduled_at END,
         stage = CASE WHEN $15 THEN $18 ELSE stage END,
         team_a_application_id = CASE WHEN $15 THEN $19 ELSE team_a_application_id END,
         team_b_application_id = CASE WHEN $15 THEN $20 ELSE team_b_application_id END,
         team_a_placeholder = CASE WHEN $15 THEN $21 ELSE team_a_placeholder END,
         team_b_placeholder = CASE WHEN $15 THEN $22 ELSE team_b_placeholder END,
         best_of = CASE WHEN $15 THEN $23 ELSE best_of END,
         sort_order = CASE WHEN $15 THEN COALESCE($24, sort_order) ELSE sort_order END,
         eliminated_team_application_id = $25,
         updated_at = NOW()
       WHERE id = $26
       RETURNING tournament_id::int`,
      [
        body.teamAScore ?? null,
        body.teamBScore ?? null,
        body.status,
        body.resultType ?? "normal",
        body.teamAResultLabel?.trim() || null,
        body.teamBResultLabel?.trim() || null,
        body.decisionNote?.trim() || null,
        body.bracketRound ?? null,
        body.bracketSide ?? null,
        body.bracketSlot ?? null,
        body.winnerToMatchId ?? null,
        body.winnerToSlot ?? null,
        body.loserToMatchId ?? null,
        body.loserToSlot ?? null,
        fullMatchUpdate,
        body.groupId ?? null,
        body.scheduledAt ?? null,
        body.stage?.trim() ?? null,
        body.teamAId ?? null,
        body.teamBId ?? null,
        body.teamAPlaceholder?.trim() || null,
        body.teamBPlaceholder?.trim() || null,
        body.bestOf ?? null,
        body.sortOrder ?? null,
        body.eliminatedTeamId ?? null,
        body.id,
      ],
    );
    if (!updated.length) {
      return Response.json({ error: "Матч не найден" }, { status: 404 });
    }
    await query(
      `INSERT INTO tournament_audit_log
        (tournament_id, actor_discord_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'result_update', 'match', $3, $4::jsonb)`,
      [
        updated[0].tournament_id,
        admin.discordId,
        String(body.id),
        JSON.stringify({
          status: body.status,
          teamAScore: body.teamAScore,
          teamBScore: body.teamBScore,
          resultType: body.resultType ?? "normal",
          teamAResultLabel: body.teamAResultLabel,
          teamBResultLabel: body.teamBResultLabel,
          decisionNote: body.decisionNote,
          scheduledAt: body.scheduledAt,
          stage: body.stage,
          teamAId: body.teamAId,
          teamBId: body.teamBId,
          bestOf: body.bestOf,
          eliminatedTeamId: body.eliminatedTeamId,
        }),
      ],
    );
    return Response.json({ ok: true });
  } catch (error) {
    return responseFromAuthError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!id) {
      return Response.json({ error: "Не указан матч" }, { status: 400 });
    }
    await query("DELETE FROM tournament_matches WHERE id = $1", [id]);
    return Response.json({ ok: true });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
