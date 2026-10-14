import { loadClanDailyActivity } from "@/app/organizer/compendium-october/services/clan-daily-activity";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await loadClanDailyActivity(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to load daily clan activity", error instanceof Error ? error.name : "Unknown error");
    return Response.json({ error: "Не удалось загрузить активность. Попробуйте ещё раз." }, { status: 500 });
  }
}
