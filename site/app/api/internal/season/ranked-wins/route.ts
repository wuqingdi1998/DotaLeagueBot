import { refreshRegisteredSeasonRankedWins } from "@/lib/season-ranked-wins/repository";
import { schedulerInternalAuthError } from "@/lib/scheduler-internal-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = schedulerInternalAuthError(request);
  if (authError) return authError;
  const result = await refreshRegisteredSeasonRankedWins();
  return Response.json({ ok: true, ...result });
}
