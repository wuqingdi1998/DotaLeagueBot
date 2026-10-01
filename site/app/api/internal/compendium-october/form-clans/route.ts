import { compendiumInternalAuthError } from "@/lib/compendium-internal-auth";
import { formOctoberClans } from "@/app/organizer/compendium-october/services/clan-formation";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

export async function POST(request: Request) {
  const authError = compendiumInternalAuthError(request);
  if (authError) return authError;
  const result = await formOctoberClans();
  return Response.json({ ok: true, ...result });
}
