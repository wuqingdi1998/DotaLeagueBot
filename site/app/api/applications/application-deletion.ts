import { unlink } from "node:fs/promises";
import path from "node:path";
import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { transaction } from "@/lib/db";

function uploadsDirectory(): string {
  return path.resolve(
    process.env.UPLOADS_DIR ?? path.join(process.cwd(), ".data", "uploads"),
    "team-emblems",
  );
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    const applicationId = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isSafeInteger(applicationId) || applicationId < 1) {
      return Response.json({ error: "Не указана заявка" }, { status: 400 });
    }

    const logoKey = await transaction(async (client) => {
      const application = await client.query<{
        tournament_id: number;
        team_name: string;
        logo_key: string | null;
        status: string;
      }>(
        `SELECT tournament_id::int, team_name, logo_key, status
         FROM tournament_team_applications
         WHERE id = $1
         FOR UPDATE`,
        [applicationId],
      );
      if (!application.rowCount) throw new Error("APPLICATION_NOT_FOUND");
      const current = application.rows[0];
      if (current.status !== "declined") {
        throw new Error("APPLICATION_NOT_DECLINED");
      }

      await client.query(
        `INSERT INTO tournament_audit_log
          (tournament_id, actor_discord_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, 'delete_declined', 'team_application', $3, $4::jsonb)`,
        [
          current.tournament_id,
          admin.discordId,
          String(applicationId),
          JSON.stringify({ teamName: current.team_name }),
        ],
      );
      await client.query(
        "DELETE FROM tournament_team_applications WHERE id = $1",
        [applicationId],
      );
      return current.logo_key;
    });

    if (logoKey && path.basename(logoKey) === logoKey) {
      await unlink(path.join(uploadsDirectory(), logoKey)).catch(() => undefined);
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "APPLICATION_NOT_FOUND") {
      return Response.json({ error: "Заявка не найдена" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "APPLICATION_NOT_DECLINED") {
      return Response.json(
        { error: "Удалить можно только отклонённую заявку" },
        { status: 409 },
      );
    }
    return responseFromAuthError(error);
  }
}
