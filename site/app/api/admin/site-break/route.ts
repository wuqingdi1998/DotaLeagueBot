import { requireAdmin, responseFromAuthError } from "@/lib/auth";
import {
  isSiteBreakEnabled,
  setSiteBreakEnabled,
} from "@/lib/site-break";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return Response.json({ isBreakEnabled: await isSiteBreakEnabled() });
  } catch (error) {
    return responseFromAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const organizer = await requireAdmin();
    const body = (await request.json()) as { isBreakEnabled?: unknown };
    if (typeof body.isBreakEnabled !== "boolean") {
      return Response.json(
        { error: "Не указано состояние перерыва" },
        { status: 400 },
      );
    }
    const isBreakEnabled = await setSiteBreakEnabled(
      body.isBreakEnabled,
      organizer.discordId,
    );
    return Response.json({ ok: true, isBreakEnabled });
  } catch (error) {
    return responseFromAuthError(error);
  }
}
