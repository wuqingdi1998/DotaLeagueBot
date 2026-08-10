import { findUnclaimedChallenges } from "@/app/compendium/services/unclaimed-challenges";
import { compendiumInternalAuthError } from "@/lib/compendium-internal-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

export async function POST(request: Request) {
  const authError = compendiumInternalAuthError(request);
  if (authError) return authError;
  return Response.json({
    ok: true,
    ...(await findUnclaimedChallenges()),
  });
}
