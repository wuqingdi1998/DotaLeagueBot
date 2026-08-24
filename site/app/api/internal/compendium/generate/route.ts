import { compendiumInternalAuthError } from "@/lib/compendium-internal-auth";
import { moscowDateKey } from "@/app/compendium/model/time";
import { ensureDailyQuestSet } from "@/app/compendium/services/repository";
import { saveFinishedStarRaceStandings } from "@/app/compendium/admin/star-race-archive-repository";
import {
  compendiumDisplayDateKey,
  isCompendiumFinished,
} from "@/app/compendium/model/lifecycle";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = compendiumInternalAuthError(request);
  if (authError) return authError;
  if (isCompendiumFinished()) {
    return Response.json({
      ok: true,
      finished: true,
      moscowDate: compendiumDisplayDateKey(),
    });
  }
  const date = moscowDateKey();
  await Promise.all([
    ensureDailyQuestSet(date),
    saveFinishedStarRaceStandings(),
  ]);
  return Response.json({ ok: true, moscowDate: date });
}
