import {
  confirmOrganizerPassword,
  requireAdmin,
  responseFromAuthError,
} from "@/lib/auth";
import { transaction } from "@/lib/db";

type TournamentDeleteRequest = {
  tournamentId?: number;
  password?: string;
};

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    let body: TournamentDeleteRequest;
    try {
      body = (await request.json()) as TournamentDeleteRequest;
    } catch {
      return Response.json(
        { error: "Некорректный запрос" },
        { status: 400 },
      );
    }
    const tournamentId = Number(body.tournamentId);
    if (!Number.isSafeInteger(tournamentId) || tournamentId <= 0) {
      return Response.json(
        { error: "Не указан турнир для удаления" },
        { status: 400 },
      );
    }

    const admin = await confirmOrganizerPassword(body.password ?? "");
    const deletedTournament = await transaction(async (client) => {
      const result = await client.query<{
        id: number;
        name: string;
        slug: string;
      }>(
        `DELETE FROM tournaments
         WHERE id = $1
         RETURNING id::int, name, slug`,
        [tournamentId],
      );
      const deleted = result.rows[0];
      if (!deleted) return null;

      await client.query(
        `INSERT INTO tournament_audit_log
          (actor_discord_id, action, entity_type, entity_id, details)
         VALUES ($1, 'tournament_delete', 'tournament', $2, $3::jsonb)`,
        [
          admin.discordId,
          String(deleted.id),
          JSON.stringify({ name: deleted.name, slug: deleted.slug }),
        ],
      );
      return deleted;
    });

    if (!deletedTournament) {
      return Response.json({ error: "Турнир не найден" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
