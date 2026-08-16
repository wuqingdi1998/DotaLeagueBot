import { compendiumInternalAuthError } from "@/lib/compendium-internal-auth";
import { processDueArcanaChecks } from "@/app/compendium/services/star-race-arcana";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = compendiumInternalAuthError(request);
  if (authError) return authError;
  return Response.json({ ok: true, ...(await processDueArcanaChecks()) });
}
