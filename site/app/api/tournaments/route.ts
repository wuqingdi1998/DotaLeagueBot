import {
  getSession,
  requireAdmin,
  responseFromAuthError,
} from "@/lib/auth";
import { query, transaction } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  const draftFilter = user?.isAdmin ? "" : "WHERE t.status <> 'draft'";
  const tournaments = await query<Record<string, unknown>>(
    `SELECT
       t.id::int,
       t.slug,
       t.name,
       t.eyebrow,
       t.description,
       t.start_at,
       t.end_at,
       t.registration_deadline,
       t.status_label,
       t.format,
       t.team_size,
       t.max_teams,
       t.region,
       t.status,
       t.tournament_type,
       t.season_round_count::int,
       COALESCE((
         SELECT COUNT(*)::int
         FROM season_participants participant
         WHERE participant.tournament_id = t.id
       ), 0)::int AS participant_count,
       COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'approved')::int AS team_count,
       COUNT(DISTINCT m.id)::int AS match_count,
       COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'finished')::int AS finished_match_count
     FROM tournaments t
     LEFT JOIN tournament_team_applications a ON a.tournament_id = t.id
     LEFT JOIN tournament_matches m ON m.tournament_id = t.id
     ${draftFilter}
     GROUP BY t.id
     ORDER BY
       CASE t.status
         WHEN 'active' THEN 0
         WHEN 'registration' THEN 1
         WHEN 'finished' THEN 2
         WHEN 'archived' THEN 3
         ELSE 4
       END,
       CASE WHEN t.status IN ('active', 'registration') THEN t.end_at END ASC,
       t.end_at DESC`,
  );

  return Response.json({ tournaments, user });
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as { id?: number; status?: string };
    const id = Number(body.id);
    const allowedStatuses = [
      "draft",
      "registration",
      "active",
      "finished",
      "archived",
    ];
    if (!id || !body.status || !allowedStatuses.includes(body.status)) {
      return Response.json(
        { error: "Не указан турнир или выбран некорректный статус" },
        { status: 400 },
      );
    }

    const updated = await transaction(async (client) => {
      const result = await client.query<{ id: number }>(
        `UPDATE tournaments
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id::int`,
        [body.status, id],
      );
      if (!result.rowCount) return false;
      await client.query(
        `INSERT INTO tournament_audit_log
          (tournament_id, actor_discord_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, 'status_change', 'tournament', $3, $4::jsonb)`,
        [
          id,
          admin.discordId,
          String(id),
          JSON.stringify({ status: body.status }),
        ],
      );
      return true;
    });

    if (!updated) {
      return Response.json({ error: "Турнир не найден" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
