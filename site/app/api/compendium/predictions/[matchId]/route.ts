import { responseFromCompendiumError } from "@/app/api/compendium/compendium-error-response";
import { submitPrediction } from "@/app/compendium/services/predictions";
import { requireCompendiumParticipantSession } from "@/app/compendium/services/participant-access";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  try {
    const user = await requireCompendiumParticipantSession();
    const body = (await request.json()) as { score?: unknown };
    const { matchId } = await params;
    return Response.json({
      ok: true,
      prediction: await submitPrediction(user, matchId, body.score),
    });
  } catch (error) {
    return responseFromCompendiumError(error);
  }
}

