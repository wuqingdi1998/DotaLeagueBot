import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { query, transaction } from "@/lib/db";
import { parseGroupCount } from "@/lib/group-generation";
import {
  formTournamentGroups,
  GroupOperationError,
  shuffleTournamentGroups,
} from "./group-operations";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as {
      action?: "form" | "shuffle";
      tournamentId?: number;
      groupCount?: number;
      teamsPerGroup?: number;
    };
    const action = body.action ?? "form";
    const tournamentId = Number(body.tournamentId);
    const groupCount = parseGroupCount(body.groupCount);
    const teamsPerGroup = Number(body.teamsPerGroup ?? 4);
    if (
      !Number.isInteger(tournamentId) ||
      tournamentId < 1 ||
      !["form", "shuffle"].includes(action)
    ) {
      return Response.json(
        { error: "Укажите турнир и действие с группами" },
        { status: 400 },
      );
    }
    if (
      action === "form" &&
      (groupCount === null ||
        !Number.isInteger(teamsPerGroup) ||
        teamsPerGroup < 3 ||
        teamsPerGroup > 8)
    ) {
      return Response.json(
        {
          error:
            "Укажите количество групп от 1 до 8 и вместимость от 3 до 8 команд",
        },
        { status: 400 },
      );
    }
    const result =
      action === "shuffle"
        ? await shuffleTournamentGroups({
            tournamentId,
            actorDiscordId: admin.discordId,
          })
        : await formTournamentGroups({
            tournamentId,
            groupCount: groupCount as number,
            teamsPerGroup,
            actorDiscordId: admin.discordId,
          });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof GroupOperationError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
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
