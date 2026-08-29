import { loadSiteBreakStatus } from "@/lib/site-break-status";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await loadSiteBreakStatus());
  } catch {
    return Response.json(
      { error: "Не удалось проверить состояние сайта" },
      { status: 503 },
    );
  }
}
