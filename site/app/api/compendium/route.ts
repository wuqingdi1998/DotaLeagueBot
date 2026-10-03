import { responseFromAuthError } from "@/lib/auth";
import { loadCompendium } from "@/app/compendium/services/compendium";
import { requireCompendiumParticipantSession } from "@/app/compendium/services/participant-access";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireCompendiumParticipantSession();
    return Response.json(await loadCompendium(user));
  } catch (error) {
    return responseFromAuthError(error);
  }
}
