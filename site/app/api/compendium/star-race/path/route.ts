import { requireCompendiumParticipantSession } from "@/app/compendium/services/participant-access";
import { chooseFinalRacePath } from "@/app/compendium/services/final-race-path";
import { loadStarRace } from "@/app/compendium/services/star-race";
import { responseFromCompendiumError } from "../../compendium-error-response";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireCompendiumParticipantSession();
    const body: unknown = await request.json().catch(() => null);
    const path = body && typeof body === "object" && "path" in body ? body.path : null;
    if (path !== "core" && path !== "support") return Response.json({ error: "Выберите существующий путь" }, { status: 400 });
    await chooseFinalRacePath(user, path);
    return Response.json({ ok: true, starRace: await loadStarRace(user) });
  } catch (error) {
    return responseFromCompendiumError(error);
  }
}
