import { getSession } from "@/lib/auth";
import { isSiteBreakEnabled } from "@/lib/site-break";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const isBreakEnabled = await isSiteBreakEnabled();
    const user = isBreakEnabled ? await getSession().catch(() => null) : null;
    return Response.json({
      isBreakEnabled,
      hasOrganizerAccess: user?.isAdmin ?? false,
    });
  } catch {
    return Response.json(
      { error: "Не удалось проверить состояние сайта" },
      { status: 503 },
    );
  }
}
