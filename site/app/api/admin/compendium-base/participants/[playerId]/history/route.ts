import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { loadCompendiumAdminParticipantHistory } from "@/app/compendium/admin/repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ playerId: string }> },
) {
  try {
    await requireAdmin();
    const { playerId } = await context.params;
    if (!/^\d{1,20}$/.test(playerId)) {
      return Response.json({ error: "Некорректный участник" }, { status: 400 });
    }
    const rewards = await loadCompendiumAdminParticipantHistory(playerId);
    if (!rewards) {
      return Response.json({ error: "Участник не найден" }, { status: 404 });
    }
    return Response.json({ rewards });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
