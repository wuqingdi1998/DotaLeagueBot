import { responseFromCompendiumError } from "@/app/api/compendium/compendium-error-response";
import { checkClanOuting } from "@/app/compendium/services/clan-outing";
import { requireCompendiumParticipantSession } from "@/app/compendium/services/participant-access";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return Response.json({
      ok: true,
      ...(await checkClanOuting(await requireCompendiumParticipantSession())),
    });
  } catch (error) {
    return responseFromCompendiumError(error);
  }
}
