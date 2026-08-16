import { responseFromCompendiumError } from "@/app/api/compendium/compendium-error-response";
import { submitFinalPrediction } from "@/app/compendium/services/star-race-final-prediction";
import { loadStarRace } from "@/app/compendium/services/star-race";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const body = (await request.json()) as { position?: unknown };
    await submitFinalPrediction({ user, position: body.position });
    return Response.json({ ok: true, starRace: await loadStarRace(user) });
  } catch (error) {
    return responseFromCompendiumError(error);
  }
}
