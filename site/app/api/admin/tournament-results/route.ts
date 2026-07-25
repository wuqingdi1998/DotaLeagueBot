import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { transaction } from "@/lib/db";

export const dynamic = "force-dynamic";

type ResultBody = {
  applicationId?: number;
  placement?: number | null;
  resultLabel?: string | null;
};

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as ResultBody;
    const applicationId = Number(body.applicationId);
    const placement =
      body.placement === null || body.placement === undefined
        ? null
        : Number(body.placement);
    const resultLabel = body.resultLabel?.trim() || null;

    if (!Number.isSafeInteger(applicationId) || applicationId < 1) {
      return Response.json({ error: "Некорректная команда" }, { status: 400 });
    }
    if (
      placement !== null &&
      (!Number.isInteger(placement) || placement < 1 || placement > 64)
    ) {
      return Response.json(
        { error: "Место должно быть числом от 1 до 64" },
        { status: 400 },
      );
    }
    if (resultLabel && resultLabel.length > 120) {
      return Response.json(
        { error: "Описание результата — не более 120 символов" },
        { status: 400 },
      );
    }

    const result = await transaction(async (client) => {
      const application = await client.query<{
        tournament_id: string;
        team_name: string;
      }>(
        `SELECT tournament_id::text, team_name
         FROM tournament_team_applications
         WHERE id = $1`,
        [applicationId],
      );
      if (!application.rowCount) return null;

      if (placement === null && resultLabel === null) {
        await client.query(
          "DELETE FROM tournament_team_results WHERE application_id = $1",
          [applicationId],
        );
      } else {
        await client.query(
          `INSERT INTO tournament_team_results
             (application_id, placement, result_label, updated_by, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (application_id) DO UPDATE SET
             placement = EXCLUDED.placement,
             result_label = EXCLUDED.result_label,
             updated_by = EXCLUDED.updated_by,
             updated_at = NOW()`,
          [applicationId, placement, resultLabel, admin.discordId],
        );
      }

      await client.query(
        `INSERT INTO tournament_audit_log
           (tournament_id, actor_discord_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, 'team_result_update', 'team_application', $3, $4::jsonb)`,
        [
          application.rows[0].tournament_id,
          admin.discordId,
          String(applicationId),
          JSON.stringify({
            teamName: application.rows[0].team_name,
            placement,
            resultLabel,
          }),
        ],
      );

      return {
        applicationId,
        placement,
        resultLabel,
      };
    });

    if (!result) {
      return Response.json({ error: "Команда не найдена" }, { status: 404 });
    }
    return Response.json({ result });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
