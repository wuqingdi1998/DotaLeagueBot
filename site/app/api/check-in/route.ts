import {
  requireAdmin,
  requireSession,
  responseFromAuthError,
} from "@/lib/auth";
import { one, query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const body = (await request.json()) as {
      tournamentId?: number;
      applicationId?: number;
    };
    if (!body.tournamentId || !body.applicationId) {
      return Response.json({ error: "Не указана команда" }, { status: 400 });
    }
    const eligibility = await one<{
      application_id: number;
      window_open: boolean;
      already_checked_in: boolean;
    }>(
      `SELECT a.id::int AS application_id,
        NOW() >= first_match.scheduled_at
          - (t.check_in_minutes || ' minutes')::interval
          AND NOW() < first_match.scheduled_at AS window_open,
        EXISTS (
          SELECT 1 FROM tournament_team_checkins c
          WHERE c.tournament_id = t.id AND c.application_id = a.id
        ) AS already_checked_in
       FROM tournaments t
       JOIN tournament_team_applications a ON a.tournament_id = t.id
       CROSS JOIN LATERAL (
         SELECT MIN(scheduled_at) AS scheduled_at
         FROM tournament_matches
         WHERE tournament_id = t.id
       ) first_match
       WHERE t.id = $1 AND a.id = $2 AND a.status = 'approved'
         AND a.captain_discord_id = $3
         AND first_match.scheduled_at IS NOT NULL`,
      [body.tournamentId, body.applicationId, user.discordId],
    );
    if (!eligibility) {
      return Response.json(
        { error: "Чек-ин доступен только капитану допущенной команды" },
        { status: 403 },
      );
    }
    if (!eligibility.window_open) {
      return Response.json(
        { error: "Окно чек-ина ещё не открыто или уже завершилось" },
        { status: 409 },
      );
    }
    if (!eligibility.already_checked_in) {
      await query(
        `INSERT INTO tournament_team_checkins
          (tournament_id, application_id, checked_in_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (tournament_id, application_id) DO NOTHING`,
        [body.tournamentId, eligibility.application_id, user.discordId],
      );
    }
    return Response.json({ ok: true });
  } catch (error) {
    return responseFromAuthError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      tournamentId?: number;
      applicationId?: number;
    };
    if (!body.tournamentId || !body.applicationId) {
      return Response.json({ error: "Не хватает данных" }, { status: 400 });
    }
    await query(
      `DELETE FROM tournament_team_checkins
       WHERE tournament_id = $1 AND application_id = $2`,
      [body.tournamentId, body.applicationId],
    );
    return Response.json({ ok: true });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
