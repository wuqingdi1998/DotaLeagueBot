import { responseFromCompendiumError } from "@/app/api/compendium/compendium-error-response";
import {
  configurePredictionMatches,
  finishPredictionMatch,
  removePredictionSchedule,
} from "@/app/compendium/services/predictions";
import { requireAdmin } from "@/lib/auth";
import { loadPredictionAdminMatches } from "@/app/compendium/services/prediction-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const administrator = await requireAdmin();
    const body = (await request.json()) as {
      sourceDateKey?: unknown;
      dateKey?: unknown;
      opensAt?: unknown;
      matches?: unknown;
    };
    if (typeof body.dateKey !== "string" || !Array.isArray(body.matches)) {
      return Response.json({ error: "Заполните дату и матчи" }, { status: 400 });
    }
    await configurePredictionMatches({
      administrator,
      sourceDateKey: body.sourceDateKey,
      dateKey: body.dateKey,
      opensAt: body.opensAt,
      matches: body.matches,
    });
    return Response.json({ ok: true, matches: await loadPredictionAdminMatches(new Date()) });
  } catch (error) {
    return responseFromCompendiumError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const administrator = await requireAdmin();
    const body = (await request.json()) as { matchId?: unknown; score?: unknown };
    if (typeof body.matchId !== "string") {
      return Response.json({ error: "Матч не выбран" }, { status: 400 });
    }
    const rewardedPlayers = await finishPredictionMatch({
      administrator,
      matchId: body.matchId,
      score: body.score,
    });
    return Response.json({ ok: true, rewardedPlayers });
  } catch (error) {
    return responseFromCompendiumError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { matchId?: unknown; dateKey?: unknown };
    const result = await removePredictionSchedule(body);
    return Response.json({
      ok: true,
      ...result,
      matches: await loadPredictionAdminMatches(new Date()),
    });
  } catch (error) {
    return responseFromCompendiumError(error);
  }
}
