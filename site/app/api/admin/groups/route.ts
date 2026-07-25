import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { query, transaction } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as {
      tournamentId?: number;
      groupCount?: number;
    };
    const tournamentId = Number(body.tournamentId);
    const groupCount = Number(body.groupCount ?? 2);
    if (!tournamentId || groupCount < 1 || groupCount > 8) {
      return Response.json(
        { error: "Укажите турнир и количество групп от 1 до 8" },
        { status: 400 },
      );
    }
    const approved = await query<{ id: number }>(
      `SELECT id::int FROM tournament_team_applications
       WHERE tournament_id = $1 AND status = 'approved'
       ORDER BY created_at, id`,
      [tournamentId],
    );
    if (approved.length < groupCount) {
      return Response.json(
        { error: "Допущенных команд меньше, чем групп" },
        { status: 409 },
      );
    }

    await transaction(async (client) => {
      const matchCount = await client.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM tournament_matches WHERE tournament_id = $1",
        [tournamentId],
      );
      if (matchCount.rows[0].count > 0) {
        throw new Error("MATCHES_EXIST");
      }
      await client.query(
        "DELETE FROM tournament_groups WHERE tournament_id = $1",
        [tournamentId],
      );
      const groupIds: number[] = [];
      for (let index = 0; index < groupCount; index += 1) {
        const name = `Группа ${String.fromCharCode(1040 + index)}`;
        const created = await client.query<{ id: number }>(
          `INSERT INTO tournament_groups(tournament_id, name, sort_order)
           VALUES ($1, $2, $3) RETURNING id::int`,
          [tournamentId, name, index],
        );
        groupIds.push(created.rows[0].id);
      }
      for (let index = 0; index < approved.length; index += 1) {
        const cycle = Math.floor(index / groupCount);
        const offset = index % groupCount;
        const groupIndex =
          cycle % 2 === 0 ? offset : groupCount - 1 - offset;
        await client.query(
          `INSERT INTO tournament_group_teams(group_id, application_id, sort_order)
           VALUES ($1, $2, $3)
           ON CONFLICT (group_id, application_id) DO NOTHING`,
          [groupIds[groupIndex], approved[index].id, cycle],
        );
      }
      await client.query(
        `INSERT INTO tournament_audit_log
          (tournament_id, actor_discord_id, action, entity_type, details)
         VALUES ($1, $2, 'generate_groups', 'groups', $3::jsonb)`,
        [
          tournamentId,
          admin.discordId,
          JSON.stringify({ groupCount, teamCount: approved.length }),
        ],
      );
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "MATCHES_EXIST") {
      return Response.json(
        { error: "Сначала удалите матчи: их группы уже используются" },
        { status: 409 },
      );
    }
    return responseFromAuthError(error);
  }
}
