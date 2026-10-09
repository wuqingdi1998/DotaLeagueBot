import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { responseFromCompendiumError } from "@/app/api/compendium/compendium-error-response";
import { challengeDates } from "@/app/compendium/admin/challenge-date";
import { loadHistoricalChallenges } from "@/app/compendium/admin/challenge-history-repository";

export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ playerId: string }> }) {
  try {
    await requireAdmin();
    const { playerId } = await context.params;
    if (!/^\d{1,20}$/.test(playerId)) return Response.json({ error: "Некорректный участник" }, { status: 400 });
    const dateKey = new URL(request.url).searchParams.get("date") ?? challengeDates()[0]?.dateKey ?? "";
    return Response.json(await loadHistoricalChallenges(playerId, dateKey), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    try { return responseFromAuthError(error); } catch (authError) { return responseFromCompendiumError(authError); }
  }
}
