import { compendiumInternalAuthError } from "@/lib/compendium-internal-auth";
import { processDueArcanaChecks } from "@/app/compendium/services/star-race-arcana";
import { isCompendiumFinished } from "@/app/compendium/model/lifecycle";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = compendiumInternalAuthError(request);
  if (authError) return authError;
  if (isCompendiumFinished()) {
    return Response.json({
      ok: true,
      finished: true,
      checked: 0,
      completed: 0,
      postponed: 0,
    });
  }
  return Response.json({ ok: true, ...(await processDueArcanaChecks()) });
}
