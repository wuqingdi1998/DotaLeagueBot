import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { listVerificationRequests } from "@/app/compendium/services/verification-repository";
import { runVerificationAttempt } from "@/app/compendium/services/verification-runner";
import { cancelVerification } from "@/app/compendium/services/cancel-verification";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireAdmin();
    return Response.json({ requests: await listVerificationRequests() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return responseFromAuthError(error); }
}
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => null);
    if (!body || typeof body.id !== "string" || !/^\d{1,19}$/.test(body.id)) {
      return Response.json({ error: "Некорректный запрос" }, { status: 400 });
    }
    const checked = await runVerificationAttempt(body.id);
    return Response.json({ checked, requests: await listVerificationRequests() });
  } catch (error) { return responseFromAuthError(error); }
}
export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => null);
    if (!body || typeof body.id !== "string" || !/^\d{1,19}$/.test(body.id)) {
      return Response.json({ error: "Некорректный запрос" }, { status: 400 });
    }
    await cancelVerification(body.id);
    return Response.json({ requests: await listVerificationRequests() });
  } catch (error) { return responseFromAuthError(error); }
}
