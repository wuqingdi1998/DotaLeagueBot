import { responseFromCompendiumError } from "@/app/api/compendium/compendium-error-response";
import {
  configureFinalPrediction,
  finishFinalPrediction,
} from "@/app/compendium/services/star-race-final-prediction";
import { loadFinalPrediction } from "@/app/compendium/services/star-race-final-prediction-repository";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const administrator = await requireAdmin();
    const body = (await request.json()) as { teams?: unknown };
    const result = await configureFinalPrediction({
      administrator,
      teams: body.teams,
    });
    return Response.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return responseFromCompendiumError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const administrator = await requireAdmin();
    const body = (await request.json()) as { position?: unknown };
    const rewardedPlayers = await finishFinalPrediction({
      administrator,
      position: body.position,
    });
    return Response.json({
      ok: true,
      rewardedPlayers,
      prediction: await loadFinalPrediction(),
    });
  } catch (error) {
    return responseFromCompendiumError(error);
  }
}
