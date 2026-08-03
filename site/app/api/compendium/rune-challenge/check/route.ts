import { requireSession } from "@/lib/auth";
import { responseFromCompendiumError } from "@/app/api/compendium/compendium-error-response";
import { checkRuneChallenge } from "@/app/compendium/services/rune-challenge";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireSession();
    return Response.json({ ok: true, ...(await checkRuneChallenge(user)) });
  } catch (error) {
    return responseFromCompendiumError(error);
  }
}
