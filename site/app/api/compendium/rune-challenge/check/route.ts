import { requireCompendiumParticipantSession } from "@/app/compendium/services/participant-access";
import { responseFromCompendiumError } from "@/app/api/compendium/compendium-error-response";
import { checkRuneChallenge } from "@/app/compendium/services/rune-challenge";
import { trackCompendiumVerification } from "@/app/compendium/services/tracked-verification";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireCompendiumParticipantSession();
    return Response.json({ ok: true, ...(await trackCompendiumVerification(user, "rune", undefined, () => checkRuneChallenge(user))) });
  } catch (error) {
    return responseFromCompendiumError(error);
  }
}
