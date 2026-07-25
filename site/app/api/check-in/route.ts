import {
  requireAdmin,
  requireSession,
  responseFromAuthError,
} from "@/lib/auth";
import { one, query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const body = (await request.json()) as { matchId?: number };
    if (!body.matchId) {
      return Response.json({ error: "Не указан матч" }, { status: 400 });
    }
    const eligibility = await one<{
      application_id: number;
      window_open: boolean;
      already_checked_in: boolean;
    }>(
      `SELECT a.id::int AS application_id,
        NOW() >= m.scheduled_at - (t.check_in_minutes || ' minutes')::interval
          AND NOW() <= m.scheduled_at AS window_open,
        EXISTS (
          SELECT 1 FROM tournament_match_checkins c
          WHERE c.match_id = m.id AND c.application_id = a.id
        ) AS already_checked_in
       FROM tournament_matches m
       JOIN tournaments t ON t.id = m.tournament_id
       JOIN tournament_team_applications a
         ON a.id IN (m.team_a_application_id, m.team_b_application_id)
       WHERE m.id = $1 AND a.captain_discord_id = $2`,
      [body.matchId, user.discordId],
    );
    if (!eligibility) {
      return Response.json(
        { error: "Check-in доступен только капитану участника этого матча" },
        { status: 403 },
      );
    }
    if (!eligibility.window_open) {
      return Response.json(
        { error: "Окно check-in ещё не открыто или уже завершилось" },
        { status: 409 },
      );
    }
    if (!eligibility.already_checked_in) {
      await query(
        `INSERT INTO tournament_match_checkins
          (match_id, application_id, checked_in_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (match_id, application_id) DO NOTHING`,
        [body.matchId, eligibility.application_id, user.discordId],
      );
      await query(
        `UPDATE tournament_matches m
         SET status = 'ready', updated_at = NOW()
         WHERE m.id = $1
           AND m.team_a_application_id IS NOT NULL
           AND m.team_b_application_id IS NOT NULL
           AND (
             SELECT COUNT(*) FROM tournament_match_checkins c
             WHERE c.match_id = m.id
               AND c.application_id IN (
                 m.team_a_application_id, m.team_b_application_id
               )
           ) = 2`,
        [body.matchId],
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
      matchId?: number;
      applicationId?: number;
    };
    if (!body.matchId || !body.applicationId) {
      return Response.json({ error: "Не хватает данных" }, { status: 400 });
    }
    await query(
      `DELETE FROM tournament_match_checkins
       WHERE match_id = $1 AND application_id = $2`,
      [body.matchId, body.applicationId],
    );
    return Response.json({ ok: true });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
