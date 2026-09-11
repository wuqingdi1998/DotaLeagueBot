import { processFearlessDraftDeadlines } from
  "@/app/fearless-draft/server/deadline-service";
import { schedulerInternalAuthError } from "@/lib/scheduler-internal-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = schedulerInternalAuthError(request);
  if (authError) return authError;
  const result = await processFearlessDraftDeadlines();
  return Response.json({ ok: true, ...result });
}
