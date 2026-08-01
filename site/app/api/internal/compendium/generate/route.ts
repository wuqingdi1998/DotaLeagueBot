import { secretMatches } from "@/lib/security";
import { moscowDateKey } from "@/app/compendium/model/time";
import { ensureDailyQuestSet } from "@/app/compendium/services/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expected = (
    process.env.COMPENDIUM_SCHEDULER_SECRET ??
    process.env.DISCORD_TOKEN ??
    ""
  ).trim();
  const authorization = request.headers.get("authorization") ?? "";
  const candidate = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  if (expected.length < 24) {
    return Response.json(
      { error: "Планировщик компендиума не настроен" },
      { status: 503 },
    );
  }
  if (!candidate || !secretMatches(candidate, expected)) {
    return Response.json({ error: "Нет доступа" }, { status: 401 });
  }
  const date = moscowDateKey();
  await ensureDailyQuestSet(date);
  return Response.json({ ok: true, moscowDate: date });
}
