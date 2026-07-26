import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { query } from "@/lib/db";

type LayoutBody = {
  matchId?: number;
  tournamentId?: number;
  gridColumn?: number;
  gridRow?: number;
  reset?: boolean;
};

function validCoordinate(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 100;
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as LayoutBody;

    if (body.reset) {
      const tournamentId = Number(body.tournamentId);
      if (!tournamentId) {
        return Response.json({ error: "Не указан турнир" }, { status: 400 });
      }
      const tournament = await query<{ id: number }>(
        "SELECT id::int FROM tournaments WHERE id = $1",
        [tournamentId],
      );
      if (!tournament.length) {
        return Response.json({ error: "Турнир не найден" }, { status: 404 });
      }
      const resetMatches = await query<{ id: number }>(
        `UPDATE tournament_matches
         SET bracket_grid_column = NULL,
             bracket_grid_row = NULL,
             updated_at = NOW()
         WHERE tournament_id = $1
           AND bracket_side IN ('upper', 'lower', 'grand_final')
         RETURNING id::int`,
        [tournamentId],
      );
      await query(
        `INSERT INTO tournament_audit_log
          (tournament_id, actor_discord_id, action, entity_type, details)
         VALUES ($1, $2, 'layout_reset', 'bracket', $3::jsonb)`,
        [
          tournamentId,
          admin.discordId,
          JSON.stringify({ matchCount: resetMatches.length }),
        ],
      );
      return Response.json({ ok: true, resetCount: resetMatches.length });
    }

    const matchId = Number(body.matchId);
    if (
      !matchId ||
      !validCoordinate(body.gridColumn) ||
      !validCoordinate(body.gridRow)
    ) {
      return Response.json(
        { error: "Позиция карточки должна находиться внутри сетки" },
        { status: 400 },
      );
    }

    const updated = await query<{ tournament_id: number }>(
      `UPDATE tournament_matches
       SET bracket_grid_column = $1,
           bracket_grid_row = $2,
           updated_at = NOW()
       WHERE id = $3
         AND bracket_side IN ('upper', 'lower', 'grand_final')
       RETURNING tournament_id::int`,
      [body.gridColumn, body.gridRow, matchId],
    );
    if (!updated.length) {
      return Response.json(
        { error: "Матч плей-офф не найден" },
        { status: 404 },
      );
    }

    await query(
      `INSERT INTO tournament_audit_log
        (tournament_id, actor_discord_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'layout_update', 'match', $3, $4::jsonb)`,
      [
        updated[0].tournament_id,
        admin.discordId,
        String(matchId),
        JSON.stringify({
          gridColumn: body.gridColumn,
          gridRow: body.gridRow,
        }),
      ],
    );
    return Response.json({ ok: true });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
