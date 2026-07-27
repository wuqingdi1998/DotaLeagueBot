import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { query, transaction } from "@/lib/db";
import { parseGroupCount } from "@/lib/group-generation";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as {
      tournamentId?: number;
      groupCount?: number;
      teamsPerGroup?: number;
    };
    const tournamentId = Number(body.tournamentId);
    const groupCount = parseGroupCount(body.groupCount);
    const teamsPerGroup = Number(body.teamsPerGroup ?? 4);
    if (
      !Number.isInteger(tournamentId) ||
      tournamentId < 1 ||
      groupCount === null
    ) {
      return Response.json(
        { error: "Укажите турнир и количество групп от 1 до 8" },
        { status: 400 },
      );
    }
    if (
      !Number.isInteger(teamsPerGroup) ||
      teamsPerGroup < 3 ||
      teamsPerGroup > 8
    ) {
      return Response.json(
        { error: "В группе должно быть от 3 до 8 команд" },
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
    if (approved.length > groupCount * teamsPerGroup) {
      return Response.json(
        {
          error: `Для ${approved.length} команд не хватает мест: увеличьте число групп или команд в группе`,
        },
        { status: 409 },
      );
    }
    if (approved.length < groupCount * 3) {
      return Response.json(
        { error: "В каждой создаваемой группе должно быть минимум 3 команды" },
        { status: 409 },
      );
    }
    const tournament = await query<{
      playoff_type: "single_elimination" | "double_elimination";
    }>(
      `SELECT playoff_type
       FROM tournaments
       WHERE id = $1`,
      [tournamentId],
    );
    if (!tournament.length) {
      return Response.json({ error: "Турнир не найден" }, { status: 404 });
    }
    const doubleElimination =
      tournament[0].playoff_type === "double_elimination";
    const advanceToUpper = doubleElimination ? 1 : 0;
    const advanceToLower = doubleElimination ? 1 : 0;
    const advanceToPlayoff = doubleElimination
      ? advanceToUpper + advanceToLower
      : Math.min(2, teamsPerGroup - 1);

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
          `INSERT INTO tournament_groups(
             tournament_id, name, sort_order, team_capacity,
             advance_to_playoff, advance_to_upper, advance_to_lower
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id::int`,
          [
            tournamentId,
            name,
            index,
            teamsPerGroup,
            advanceToPlayoff,
            advanceToUpper,
            advanceToLower,
          ],
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
          JSON.stringify({
            groupCount,
            teamsPerGroup,
            teamCount: approved.length,
            playoffType: tournament[0].playoff_type,
          }),
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

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as {
      groupId?: number;
      explanation?: string | null;
      teamCapacity?: number;
      advanceToPlayoff?: number;
      advanceToUpper?: number;
      advanceToLower?: number;
    };
    const groupId = Number(body.groupId);
    const teamCapacity = Number(body.teamCapacity);
    const advanceToPlayoff = Number(body.advanceToPlayoff ?? 0);
    const advanceToUpper = Number(body.advanceToUpper ?? 0);
    const advanceToLower = Number(body.advanceToLower ?? 0);
    if (
      !groupId ||
      !Number.isInteger(teamCapacity) ||
      teamCapacity < 3 ||
      teamCapacity > 8
    ) {
      return Response.json(
        { error: "Укажите группу и количество команд от 3 до 8" },
        { status: 400 },
      );
    }
    const groups = await query<{
      tournament_id: number;
      playoff_type: "single_elimination" | "double_elimination";
      team_count: number;
    }>(
      `SELECT tournament_group.tournament_id::int,
         tournament.playoff_type,
         COUNT(group_team.application_id)::int AS team_count
       FROM tournament_groups tournament_group
       JOIN tournaments tournament
         ON tournament.id = tournament_group.tournament_id
       LEFT JOIN tournament_group_teams group_team
         ON group_team.group_id = tournament_group.id
       WHERE tournament_group.id = $1
       GROUP BY tournament_group.id, tournament.playoff_type`,
      [groupId],
    );
    if (!groups.length) {
      return Response.json({ error: "Группа не найдена" }, { status: 404 });
    }
    if (groups[0].team_count > teamCapacity) {
      return Response.json(
        {
          error: `В группе уже ${groups[0].team_count} команд — нельзя установить меньшую вместимость`,
        },
        { status: 409 },
      );
    }
    const doubleElimination =
      groups[0].playoff_type === "double_elimination";
    if (
      doubleElimination &&
      (!Number.isInteger(advanceToUpper) ||
        !Number.isInteger(advanceToLower) ||
        advanceToUpper < 0 ||
        advanceToLower < 0 ||
        advanceToUpper + advanceToLower < 1 ||
        advanceToUpper + advanceToLower > teamCapacity)
    ) {
      return Response.json(
        {
          error:
            "Для Double Elimination укажите корректное число команд в верхнюю и нижнюю сетку",
        },
        { status: 400 },
      );
    }
    if (
      !doubleElimination &&
      (!Number.isInteger(advanceToPlayoff) ||
        advanceToPlayoff < 1 ||
        advanceToPlayoff > teamCapacity)
    ) {
      return Response.json(
        {
          error:
            "Для Single Elimination укажите корректное число команд, выходящих в плей-офф",
        },
        { status: 400 },
      );
    }

    await transaction(async (client) => {
      await client.query(
        `UPDATE tournament_groups
         SET explanation = $1,
           team_capacity = $2,
           advance_to_playoff = $3,
           advance_to_upper = $4,
           advance_to_lower = $5
         WHERE id = $6`,
        [
          body.explanation?.trim() || null,
          teamCapacity,
          doubleElimination
            ? advanceToUpper + advanceToLower
            : advanceToPlayoff,
          doubleElimination ? advanceToUpper : 0,
          doubleElimination ? advanceToLower : 0,
          groupId,
        ],
      );
      await client.query(
        `INSERT INTO tournament_audit_log
          (tournament_id, actor_discord_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, 'settings_update', 'group', $3, $4::jsonb)`,
        [
          groups[0].tournament_id,
          admin.discordId,
          String(groupId),
          JSON.stringify({
            teamCapacity,
            advanceToPlayoff,
            advanceToUpper,
            advanceToLower,
            hasExplanation: Boolean(body.explanation?.trim()),
          }),
        ],
      );
    });
    return Response.json({ ok: true });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
