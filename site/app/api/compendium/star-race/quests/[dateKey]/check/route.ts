import { requireCompendiumParticipantSession } from "@/app/compendium/services/participant-access";
import { responseFromCompendiumError } from "@/app/api/compendium/compendium-error-response";
import { checkStarRaceQuest } from "@/app/compendium/services/star-race";
import { trackCompendiumVerification } from "@/app/compendium/services/tracked-verification";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ dateKey: string }> },
) {
  try {
    const user = await requireCompendiumParticipantSession();
    const { dateKey } = await context.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return Response.json({ error: "Некорректная дата задания" }, { status: 400 });
    }
    return Response.json({
      ok: true,
      ...(await trackCompendiumVerification(user, "star_race", dateKey, () => checkStarRaceQuest(user, dateKey))),
    });
  } catch (error) {
    return responseFromCompendiumError(error);
  }
}
