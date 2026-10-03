import { publishOctoberClans } from "@/app/organizer/compendium-october/services/clan-formation";
import {
  decideOctoberLaunch,
  loadOctoberLaunchReport,
} from "@/app/organizer/compendium-october/services/clan-launch-repository";
import { requireAdmin, responseFromAuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return Response.json({ report: await loadOctoberLaunchReport() });
  } catch (error) {
    return responseFromAuthError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const administrator = await requireAdmin();
    const body = (await request.json()) as { decision?: unknown };
    if (body.decision !== "approve" && body.decision !== "cancel") {
      return Response.json({ error: "Выберите запуск или отмену" }, { status: 400 });
    }
    try {
      await decideOctoberLaunch(body.decision, administrator.actorDiscordId);
    } catch (error) {
      if (error instanceof Error && error.message === "LAUNCH_DECISION_UNAVAILABLE") {
        return Response.json(
          { error: "Решение уже принято или отчёт ещё не готов" },
          { status: 409 },
        );
      }
      throw error;
    }
    if (body.decision === "approve") await publishOctoberClans();
    return Response.json({ ok: true, report: await loadOctoberLaunchReport() });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
