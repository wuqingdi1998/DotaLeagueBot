import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { parseRankedWinUpdate } from "@/lib/season-ranked-wins/organizer-model";
import { updateOrganizerRankedWins } from "@/lib/season-ranked-wins/organizer-service";
import { SeasonRankedWinsError } from "@/lib/season-ranked-wins/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const update = parseRankedWinUpdate(await request.json().catch(() => null));
    if (!update) return Response.json({ error: "Проверьте игрока, роли и количество побед: нужны два целых неотрицательных числа" }, { status: 400 });
    return Response.json(await updateOrganizerRankedWins(update, admin.discordId));
  } catch (error) {
    if (error instanceof SeasonRankedWinsError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    return responseFromAuthError(error);
  }
}
