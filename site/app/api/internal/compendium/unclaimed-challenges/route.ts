import { findUnclaimedChallenges } from "@/app/compendium/services/unclaimed-challenges";
import { compendiumInternalAuthError } from "@/lib/compendium-internal-auth";
import { isCompendiumFinished } from "@/app/compendium/model/lifecycle";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

export async function POST(request: Request) {
  const authError = compendiumInternalAuthError(request);
  if (authError) return authError;
  if (isCompendiumFinished()) {
    return Response.json({
      ok: true,
      finished: true,
      checkedCount: 0,
      failedCount: 0,
      players: [],
    });
  }
  return Response.json({
    ok: true,
    ...(await findUnclaimedChallenges()),
  });
}
