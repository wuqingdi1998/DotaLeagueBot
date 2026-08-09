import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { adminAbandonDraftSeries } from "@/app/fearless-draft/server/admin-service";
import {
  DraftRequestError,
  draftErrorResponse,
} from "@/app/fearless-draft/server/errors";

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { seriesId?: unknown };
    if (typeof body.seriesId !== "number") {
      throw new DraftRequestError("Серия не указана");
    }
    await adminAbandonDraftSeries(body.seriesId);
    return Response.json({ ok: true });
  } catch (error) {
    return draftErrorResponse(error) ?? responseFromAuthError(error);
  }
}
