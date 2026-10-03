import { checkDailyQuest } from "@/app/compendium/services/compendium";
import { requireCompendiumParticipantSession } from "@/app/compendium/services/participant-access";
import { responseFromCompendiumError } from "@/app/api/compendium/compendium-error-response";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ questId: string }> },
) {
  try {
    const user = await requireCompendiumParticipantSession();
    const { questId } = await context.params;
    if (!/^\d{1,19}$/.test(questId)) {
      return Response.json({ error: "Некорректное задание" }, { status: 400 });
    }
    return Response.json({
      ok: true,
      ...(await checkDailyQuest(user, questId)),
    });
  } catch (error) {
    return responseFromCompendiumError(error);
  }
}
