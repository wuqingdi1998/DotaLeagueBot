import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { query, transaction } from "@/lib/db";

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
};

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
  return "";
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as MatchBody;
    const validationError = validMatch(body);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }
    const created = await transaction(async (client) => {
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
      return id;
    });
    return Response.json({ ok: true, id: created }, { status: 201 });
  } catch (error) {
    return responseFromAuthError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as MatchBody;
    if (!body.id || !body.status) {
      return Response.json(
        { error: "Не указан матч или статус" },
        { status: 400 },
      );
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
    if (
      body.status === "finished" &&
      (body.resultType ?? "normal") === "normal" &&
      (!Number.isInteger(body.teamAScore) || !Number.isInteger(body.teamBScore))
    ) {
      return Response.json(
        { error: "Для завершённого матча укажите счёт обеих команд" },
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
    const updated = await query<{ tournament_id: number }>(
      `UPDATE tournament_matches
       SET team_a_score = $1, team_b_score = $2, status = $3,
         result_type = $4, team_a_result_label = $5,
         team_b_result_label = $6, decision_note = $7,
         bracket_round = $8, bracket_side = $9, bracket_slot = $10,
         updated_at = NOW()
       WHERE id = $11
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
