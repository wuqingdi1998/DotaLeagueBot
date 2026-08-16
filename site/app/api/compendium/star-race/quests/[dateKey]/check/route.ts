import { requireSession } from "@/lib/auth";
import { responseFromCompendiumError } from "@/app/api/compendium/compendium-error-response";
import { checkStarRaceQuest } from "@/app/compendium/services/star-race";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ dateKey: string }> },
) {
  try {
    const user = await requireSession();
    const { dateKey } = await context.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return Response.json({ error: "Некорректная дата задания" }, { status: 400 });
    }
    return Response.json({
      ok: true,
      ...(await checkStarRaceQuest(user, dateKey)),
    });
  } catch (error) {
    return responseFromCompendiumError(error);
  }
}
