import { responseFromCompendiumError } from "@/app/api/compendium/compendium-error-response";
import { submitPrediction } from "@/app/compendium/services/predictions";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  try {
    const user = await requireSession();
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

