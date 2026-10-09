import { responseFromCompendiumError } from "@/app/api/compendium/compendium-error-response";
import { checkClanOuting } from "@/app/compendium/services/clan-outing";
import { requireCompendiumParticipantSession } from "@/app/compendium/services/participant-access";
import { trackCompendiumVerification } from "@/app/compendium/services/tracked-verification";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireCompendiumParticipantSession();
    return Response.json({
      ok: true,
      ...(await trackCompendiumVerification(user, "clan_outing", undefined, () => checkClanOuting(user))),
    });
  } catch (error) {
    return responseFromCompendiumError(error);
  }
}
