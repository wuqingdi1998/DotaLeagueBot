import { publishOctoberClans } from "@/app/organizer/compendium-october/services/clan-formation";
import { compendiumInternalAuthError } from "@/lib/compendium-internal-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = compendiumInternalAuthError(request);
  if (authError) return authError;
  return Response.json({ ok: true, ...await publishOctoberClans() });
}
