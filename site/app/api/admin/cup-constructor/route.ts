import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import { loadCupConstructor, saveCupConstructor } from "@/app/organizer/cup/services/cup-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return Response.json(await loadCupConstructor(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return responseFromAuthError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return Response.json({ error: "Некорректные данные" }, { status: 400 });
    return Response.json(await saveCupConstructor(body.board, body.revision));
  } catch (error) {
    return responseFromAuthError(error);
  }
}
