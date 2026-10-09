import { compendiumInternalAuthError } from "@/lib/compendium-internal-auth";
import { processDueVerifications } from "@/app/compendium/services/verification-runner";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const error = compendiumInternalAuthError(request);
  if (error) return error;
  return Response.json({ ok: true, ...await processDueVerifications() });
}
