import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { updateGroupSettings, type GroupSettingsInput } from "./group-settings";
import { GroupConfigurationError } from "./group-configuration-error";
import { parseGroupCount } from "@/lib/group-generation";
import {
  formTournamentGroups,
  rebuildTournamentPostseason,
  GroupOperationError,
  shuffleTournamentGroups,
} from "./group-operations";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as {
      action?: "form" | "shuffle" | "rebuild_playoffs";
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
      !["form", "shuffle", "rebuild_playoffs"].includes(action)
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
    if (action === "rebuild_playoffs") {
      return Response.json({ ok: true, ...await rebuildTournamentPostseason({ tournamentId, actorDiscordId: admin.actorDiscordId }) });
    }
    const result =
      action === "shuffle"
        ? await shuffleTournamentGroups({
            tournamentId,
            actorDiscordId: admin.actorDiscordId,
          })
        : await formTournamentGroups({
            tournamentId,
            groupCount: groupCount as number,
            teamsPerGroup,
            actorDiscordId: admin.actorDiscordId,
          });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof GroupOperationError || error instanceof GroupConfigurationError) {
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
    const body = await request.json() as GroupSettingsInput;
    await updateGroupSettings(body, admin.actorDiscordId);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof GroupConfigurationError) return Response.json({ error: error.message }, { status: error.status });
    return responseFromAuthError(error);
  }
}
